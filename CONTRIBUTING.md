# Contributing to AirwayLab

Thanks for your interest in contributing! AirwayLab is an open-source project that helps CPAP users understand their therapy data better.

## Getting Started

```bash
git clone https://github.com/airwaylab-app/airwaylab.git
cd airwaylab
cp .env.local.example .env.local  # Configure environment variables
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The demo mode works without any external services.

### Environment Variables

- **Required for basic development:** None — the app runs fully client-side
- **Optional:** Supabase credentials (for auth/premium features), Sentry DSN (error reporting), Plausible domain (analytics)

See `.env.local.example` for details.

## Code Style

- **TypeScript strict mode** — avoid `any`
- **Tailwind CSS** for styling, **shadcn/ui** for component primitives
- **ESLint** with Next.js config — run `npm run lint` before submitting
- **Vitest + Testing Library** for tests — run `npm test`

## Pull Request Process

1. **Open an issue first** for large changes or new features
2. **Fork and branch** from `main`
3. **Keep PRs focused** — one concern per PR
4. **Run checks** before submitting:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
5. **Write tests** for new functionality
6. **Update documentation** if behaviour changes

## Architecture Notes

- **All analysis runs client-side** — never add server-side processing of user health data
- **Web Workers** handle heavy computation (Glasgow, WAT, NED, Oximetry engines)
- **localStorage** is used for persistence (summary data only, 4MB cap)

## Areas Where Help Is Wanted

- AirSense 11 parser improvements (currently experimental)
- Philips Respironics device support
- Additional pulse oximeter formats
- Internationalisation (i18n)
- Accessibility improvements
- Test coverage

## License

AirwayLab is licensed under **GPL-3.0**. By contributing, you agree that your contributions will be licensed under the same terms. This means:

- All derivative works must also be GPL-3.0
- Your contributions will be publicly available under the same license
- You retain copyright of your contributions

See [LICENSE](LICENSE) for the full text.
