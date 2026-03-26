/**
 * Device-specific guide data for AirwayLab.
 *
 * Each guide targets long-tail SEO queries like:
 * "how to upload AirSense 10 data", "AirCurve SD card analysis"
 */

export interface DeviceGuide {
  slug: string;
  name: string;
  fullName: string;
  manufacturer: string;
  type: 'CPAP' | 'BiPAP' | 'Auto';
  supportLevel: 'full' | 'partial';
  sdCardLocation: string;
  sdCardType: string;
  datalogPath: string;
  sampleRate: string;
  signals: string[];
  uploadSteps: string[];
  tips: string[];
  troubleshooting: { question: string; answer: string }[];
  metaDescription: string;
}

export const DEVICE_GUIDES: DeviceGuide[] = [
  {
    slug: 'airsense-10',
    name: 'AirSense 10',
    fullName: 'ResMed AirSense 10',
    manufacturer: 'ResMed',
    type: 'Auto',
    supportLevel: 'full',
    sdCardLocation: 'Right side of the machine, behind a small flip-open door',
    sdCardType: 'Standard SD card (not micro). A card is included with the machine.',
    datalogPath: 'DATALOG folder on the SD card root',
    sampleRate: '25 Hz for flow waveform data (BRP.edf files)',
    signals: [
      'Flow waveform (BRP.edf) — breath-by-breath inspiratory flow used by all four AirwayLab engines',
      'Session summary (STR.edf) — machine settings, pressure levels, usage hours per night',
      'Device info (Identification.tgt) — device model, serial number',
    ],
    uploadSteps: [
      'Power off your AirSense 10 and unplug it from the wall.',
      'Open the SD card slot on the right side of the machine. Push the card gently to eject it.',
      'Insert the SD card into your computer using an SD card reader (most laptops have a built-in slot).',
      'Go to https://airwaylab.app/analyze and click "Upload Your SD Card."',
      'Select the entire SD card, or navigate to the DATALOG folder and select it. AirwayLab finds the right files automatically.',
      'Wait 30-60 seconds for all four engines to process your data. Results appear in the dashboard.',
      'When done, eject the SD card safely and put it back in your machine.',
    ],
    tips: [
      'Keep the SD card in your machine at all times. It records detailed data every night that your machine\'s app (myAir) doesn\'t show you.',
      'Upload weekly or monthly for best trend tracking. One night is a snapshot, trends tell the real story.',
      'The SD card stores months of data. Even if you haven\'t uploaded before, your historical nights are there.',
      'AirSense 10 AutoSet, Elite, and CPAP models all use the same EDF format. AirwayLab supports all of them.',
    ],
    troubleshooting: [
      {
        question: 'AirwayLab says "No valid EDF files found"',
        answer: 'Make sure you\'re selecting the DATALOG folder (or the SD card root that contains it), not individual files. The DATALOG folder contains subfolders with dates — AirwayLab needs the whole folder structure to group sessions into nights.',
      },
      {
        question: 'My SD card is empty or has very little data',
        answer: 'Check that the SD card is properly seated in the machine. The card should click into place. If the machine has been running without the card, no detailed data was recorded during that period. Insert it now and data will accumulate from tonight.',
      },
      {
        question: 'Analysis shows 0 nights',
        answer: 'This usually means the DATALOG folder is missing or contains no BRP.edf files. Older AirSense 10 machines with outdated firmware may not record flow data. Check that your firmware is current via the clinician menu.',
      },
      {
        question: 'Glasgow Index seems very high (above 4)',
        answer: 'A Glasgow Index above 3-4 suggests significant flow limitation. This could indicate your pressure settings need adjustment. Compare multiple nights before drawing conclusions, and discuss with your sleep clinician.',
      },
    ],
    metaDescription:
      'Step-by-step guide to uploading ResMed AirSense 10 SD card data to AirwayLab for flow limitation analysis. Free, browser-based, no installation needed.',
  },
  {
    slug: 'airsense-11',
    name: 'AirSense 11',
    fullName: 'ResMed AirSense 11',
    manufacturer: 'ResMed',
    type: 'Auto',
    supportLevel: 'partial',
    sdCardLocation: 'Right side of the machine, behind a flip-open door (same position as AirSense 10)',
    sdCardType: 'Standard SD card. Note: some AirSense 11 models ship without an SD card — you may need to purchase one separately.',
    datalogPath: 'DATALOG folder on the SD card root',
    sampleRate: '25 Hz (same as AirSense 10, but signal names differ)',
    signals: [
      'Flow waveform (BRP.edf) — breath-by-breath flow data, though the EDF header format differs from AirSense 10',
      'Session summary (STR.edf) — machine settings with updated signal naming',
      'Device info (Identification.tgt) — device model identification',
    ],
    uploadSteps: [
      'Power off your AirSense 11 and unplug it.',
      'Open the SD card slot on the right side. Push the card gently to eject.',
      'If your machine didn\'t come with an SD card, insert a standard SD card (any size, formatted FAT32) and run the machine for at least one night before uploading.',
      'Insert the SD card into your computer.',
      'Go to https://airwaylab.app/analyze and click "Upload Your SD Card."',
      'Select the SD card or DATALOG folder. AirwayLab detects the AirSense 11 format automatically.',
      'Results may show partial data for some metrics. This is expected — see the note below.',
    ],
    tips: [
      'AirSense 11 support is partial. The core engines (Glasgow Index, WAT, NED) work with AirSense 11 flow data, but some machine settings extraction may be incomplete due to changed signal names in STR.edf.',
      'If you see "Unknown" for pressure settings in your results, this is an AirSense 11 compatibility limitation, not a data problem.',
      'The AirSense 11 uses the same SD card slot and EDF format family as the AirSense 10, so the upload process is identical.',
      'ResMed\'s myAir app works differently on AirSense 11 (cellular upload). The SD card data is more detailed than what myAir shows.',
    ],
    troubleshooting: [
      {
        question: 'AirwayLab shows "partially supported device"',
        answer: 'This is expected for AirSense 11. The flow waveform data is parsed correctly, but some metadata fields use different signal names than AirSense 10. Flow limitation analysis (Glasgow, WAT, NED) still works. Settings extraction may be incomplete.',
      },
      {
        question: 'My AirSense 11 didn\'t come with an SD card',
        answer: 'Some AirSense 11 models ship without a card. Buy any standard SD card (2GB or larger, FAT32 formatted), insert it, and the machine will start recording detailed data from the next session. Data is not retroactive — only nights after the card is inserted are recorded.',
      },
      {
        question: 'Pressure settings show as "Unknown"',
        answer: 'AirSense 11 uses different signal names in its settings file. AirwayLab may not extract all settings correctly. This doesn\'t affect the flow limitation analysis — only the settings display in the dashboard.',
      },
    ],
    metaDescription:
      'How to upload ResMed AirSense 11 data to AirwayLab. Partial support for flow limitation analysis. Free, browser-based guide with troubleshooting.',
  },
  {
    slug: 'aircurve-10',
    name: 'AirCurve 10',
    fullName: 'ResMed AirCurve 10',
    manufacturer: 'ResMed',
    type: 'BiPAP',
    supportLevel: 'full',
    sdCardLocation: 'Back of the machine, behind a panel near the bottom',
    sdCardType: 'Standard SD card. Included with the machine.',
    datalogPath: 'DATALOG folder on the SD card root',
    sampleRate: '25 Hz for flow waveform data',
    signals: [
      'Flow waveform (BRP.edf) — breath-by-breath flow data, identical format to AirSense 10',
      'Session summary (STR.edf) — includes BiPAP-specific settings: EPAP, IPAP min/max, pressure support, trigger sensitivity, cycle sensitivity',
      'Device info (Identification.tgt) — device model (VAuto, ST, ASV variants)',
    ],
    uploadSteps: [
      'Power off your AirCurve 10 and unplug it.',
      'Locate the SD card slot on the back of the machine, near the bottom. It may be behind a small panel.',
      'Push the card gently to eject it.',
      'Insert the SD card into your computer.',
      'Go to https://airwaylab.app/analyze and click "Upload Your SD Card."',
      'Select the SD card or DATALOG folder. AirwayLab detects BiPAP data and extracts pressure support settings automatically.',
      'Your results will include BiPAP-specific metrics like EPAP, IPAP, and pressure support alongside the flow limitation analysis.',
    ],
    tips: [
      'AirCurve 10 data is especially rich because BiPAP machines record both EPAP and IPAP pressure levels. AirwayLab extracts these and factors them into the analysis.',
      'If you\'re on a VAuto, your machine adjusts EPAP automatically. AirwayLab shows the actual delivered pressures per night, not just your min/max settings.',
      'BiPAP users often see different flow limitation patterns than CPAP users. The pressure support component means the NED engine is particularly relevant for your data.',
      'AirCurve 10 ST, VAuto, and ASV models all use the same EDF format. AirwayLab supports all variants.',
    ],
    troubleshooting: [
      {
        question: 'My AirCurve 10 SD card slot is hard to find',
        answer: 'Unlike the AirSense 10 (side slot), the AirCurve 10 SD card is on the back of the machine. Look for a small panel near the bottom. Some models require you to slide a cover to expose the slot.',
      },
      {
        question: 'Results don\'t show EPAP/IPAP values',
        answer: 'Check that the STR.edf file is present on the SD card (it should be in the root directory, not inside DATALOG). If the card was formatted or the file is missing, AirwayLab can still analyse flow data but won\'t have machine settings context.',
      },
      {
        question: 'I\'m on an ASV machine — is that supported?',
        answer: 'AirCurve 10 ASV uses the same EDF format and is fully supported. ASV machines have additional adaptive pressure algorithms, and the flow data they record is particularly detailed. AirwayLab analyses the flow waveforms the same way regardless of the ASV mode.',
      },
    ],
    metaDescription:
      'How to upload ResMed AirCurve 10 BiPAP data to AirwayLab. Full support for VAuto, ST, and ASV models. Free flow limitation analysis guide.',
  },
];

export function getGuideBySlug(slug: string): DeviceGuide | undefined {
  return DEVICE_GUIDES.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return DEVICE_GUIDES.map((g) => g.slug);
}
