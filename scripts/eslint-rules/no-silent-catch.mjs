/**
 * ESLint rule: airwaylab/no-silent-catch
 *
 * Flags catch blocks and .catch() handlers that silently swallow errors
 * without user-visible feedback, Sentry reporting, or documented intent.
 *
 * What it flags:
 *   - Empty catch blocks (zero statements)
 *   - Catch blocks with only console.* calls (no Sentry, setState, throw, etc.)
 *   - Empty .catch(() => {}) handlers without a justifying comment
 *
 * What it allows:
 *   - Catch blocks containing: throw, Sentry calls, set*() state calls,
 *     NextResponse/Response, postMessage, reject()
 *   - .catch() on .json() / .text() calls (HTTP body parsing idiom)
 *   - Any catch handler with an inline comment documenting intent
 *   - e2e test files (excluded via config, not rule logic)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow catch blocks that silently swallow errors without user-visible feedback',
    },
    messages: {
      emptyCatch:
        'Empty catch block silently swallows errors. Add error handling (Sentry, user feedback, re-throw) or a justifying comment.',
      consoleOnlyCatch:
        'Catch block only logs to console. Add Sentry reporting, user-visible error state, or re-throw. If intentional, add an eslint-disable with justification.',
      silentPromiseCatch:
        'Silent .catch() handler swallows errors. Add error handling or a comment documenting why this is safe.',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Check whether a node (or any descendant) contains a call that
     * constitutes "real" error handling.
     */
    function hasRealErrorHandling(node) {
      if (!node) return false;

      // throw statement
      if (node.type === 'ThrowStatement') return true;

      // return with a non-trivial value (not bare `return;`)
      // We don't flag returns -- they might be returning error state.

      // Call expressions: Sentry, setState, NextResponse, postMessage, reject
      if (node.type === 'CallExpression') {
        const callee = node.callee;

        // Sentry.captureException / captureException / captureMessage
        if (callee.type === 'MemberExpression') {
          const obj = callee.object;
          const prop = callee.property;
          if (obj.type === 'Identifier' && obj.name === 'Sentry') return true;
          if (
            prop.type === 'Identifier' &&
            (prop.name === 'captureException' || prop.name === 'captureMessage')
          )
            return true;
        }
        if (callee.type === 'Identifier') {
          if (callee.name === 'captureException' || callee.name === 'captureMessage')
            return true;
        }

        // set*() -- React state setters (setError, setStatus, setState, etc.)
        if (callee.type === 'Identifier' && /^set[A-Z]/.test(callee.name)) return true;

        // NextResponse.json() / new Response()
        if (callee.type === 'MemberExpression') {
          const obj = callee.object;
          if (obj.type === 'Identifier' && obj.name === 'NextResponse') return true;
        }
        if (node.type === 'NewExpression') {
          const callee2 = node.callee;
          if (callee2.type === 'Identifier' && callee2.name === 'Response') return true;
        }

        // postMessage (Web Worker error reporting)
        if (callee.type === 'Identifier' && callee.name === 'postMessage') return true;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'postMessage'
        )
          return true;

        // reject() -- Promise rejection
        if (callee.type === 'Identifier' && callee.name === 'reject') return true;
      }

      // NewExpression: new Response(...)
      if (node.type === 'NewExpression') {
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'Response') return true;
      }

      // Assignment to error-related variables (error = ..., err = ...)
      if (
        node.type === 'AssignmentExpression' &&
        node.left.type === 'Identifier' &&
        /error|err|failure/i.test(node.left.name)
      )
        return true;

      // Recurse into child nodes
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && item.type && hasRealErrorHandling(item))
              return true;
          }
        } else if (child && typeof child === 'object' && child.type) {
          if (hasRealErrorHandling(child)) return true;
        }
      }

      return false;
    }

    /**
     * Check if a node's body contains only console.* calls.
     */
    function isConsoleOnly(statements) {
      if (statements.length === 0) return false;

      return statements.every((stmt) => {
        if (stmt.type !== 'ExpressionStatement') return false;
        const expr = stmt.expression;
        if (expr.type !== 'CallExpression') return false;
        const callee = expr.callee;
        if (callee.type !== 'MemberExpression') return false;
        return (
          callee.object.type === 'Identifier' && callee.object.name === 'console'
        );
      });
    }

    /**
     * Check if a node has any comments inside it (indicating documented intent).
     */
    function hasInternalComments(node) {
      const comments = sourceCode.getCommentsInside(node);
      return comments.length > 0;
    }

    /**
     * Check if the .catch() is on a .json() or .text() call (HTTP body parsing idiom).
     */
    function isJsonOrTextParseCatch(callNode) {
      const callee = callNode.callee;
      if (callee.type !== 'MemberExpression') return false;

      // The object of .catch() should be something like res.json() or res.text()
      const obj = callee.object;
      if (obj.type === 'CallExpression' && obj.callee.type === 'MemberExpression') {
        const methodName = obj.callee.property;
        if (
          methodName.type === 'Identifier' &&
          (methodName.name === 'json' || methodName.name === 'text')
        )
          return true;
      }

      return false;
    }

    // ── Visitors ─────────────────────────────────────────────────────

    return {
      // Try-catch blocks
      CatchClause(node) {
        const statements = node.body.body;

        // Empty catch block
        if (statements.length === 0) {
          // Allow if there are comments inside documenting intent
          if (hasInternalComments(node.body)) return;

          context.report({ node, messageId: 'emptyCatch' });
          return;
        }

        // Console-only catch block
        if (isConsoleOnly(statements) && !hasRealErrorHandling(node.body)) {
          context.report({ node, messageId: 'consoleOnlyCatch' });
        }
      },

      // Promise .catch() handlers
      'CallExpression[callee.property.name="catch"]'(node) {
        // Skip .json().catch() and .text().catch() idioms
        if (isJsonOrTextParseCatch(node)) return;

        const callback = node.arguments[0];
        if (!callback) return;

        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        )
          return;

        const body = callback.body;

        // Block body
        if (body.type === 'BlockStatement') {
          // Empty block without comments
          if (body.body.length === 0 && !hasInternalComments(body)) {
            context.report({ node: callback, messageId: 'silentPromiseCatch' });
            return;
          }

          // Console-only without real error handling
          if (isConsoleOnly(body.body) && !hasRealErrorHandling(body)) {
            context.report({ node: callback, messageId: 'consoleOnlyCatch' });
          }

          return;
        }

        // Expression body: .catch(() => someExpression)
        // Only flag if the expression is a no-op literal
        // (null, undefined, false, empty string, 0)
        if (
          body.type === 'Literal' &&
          (body.value === null || body.value === false || body.value === '' || body.value === 0)
        ) {
          // These are common in e2e tests and sometimes intentional.
          // Only flag if there are no comments on the catch call itself.
          const commentsBefore = sourceCode.getCommentsBefore(node);
          const commentsAfter = sourceCode.getCommentsAfter(node);
          if (commentsBefore.length === 0 && commentsAfter.length === 0) {
            // Check if the parent expression has trailing comments
            const parent = node.parent;
            if (parent) {
              const parentComments = sourceCode.getCommentsAfter(parent);
              if (parentComments.length > 0) return;
            }
          } else {
            return;
          }
          // Don't flag these as errors -- they're often intentional returns
          // for boolean/null patterns. The empty-body catches are the real risk.
        }
      },
    };
  },
};

export default rule;
