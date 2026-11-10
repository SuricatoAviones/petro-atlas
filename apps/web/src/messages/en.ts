import type { Messages } from './es';

/** Interface texts in English; the shape is checked against the Spanish dictionary. */
export const messagesEn: Messages = {
  app: {
    name: 'PetroAtlas',
    tagline: 'Oil well explorer',
    description:
      'Oil well map with production and pressure series and petroleum engineering tools.',
    navigation: 'Main navigation',
    map: 'Map',
    sources: 'Sources and licences',
    language: 'Language',
    spanish: 'Español',
    english: 'English',
  },
  map: {
    label: 'Well map',
    loading: 'Loading the basemap…',
    loadError: 'Could not load the basemap. Check your connection and reload the page.',
    dataError: 'Could not load the wells. Try again in a few minutes.',
    colorMode: {
      legend: 'Well colour',
      status: 'Status',
      type: 'Type',
    },
    legend: {
      title: 'Legend',
      cluster: 'Well cluster',
      field: 'Field',
      imported: 'Imported well',
      unknownType: 'No type',
    },
    bubbles: {
      title: 'Bubble map',
      none: 'No bubbles',
      oil: 'Oil',
      gas: 'Gas',
      water: 'Water',
      legend: 'Cumulative volume',
      loading: 'Loading cumulative volumes…',
      loadError: 'Could not load cumulative volumes.',
    },
    controls: {
      'NavigationControl.ZoomIn': 'Zoom in',
      'NavigationControl.ZoomOut': 'Zoom out',
      'NavigationControl.ResetBearing': 'Reset bearing to north',
      'AttributionControl.ToggleAttribution': 'Toggle attribution',
      'ScaleControl.Meters': 'm',
      'ScaleControl.Kilometers': 'km',
    },
  },
  filters: {
    label: 'Well filters',
    title: 'Filters',
    reset: 'Clear filters',
    loading: 'Updating the count…',
    countError: 'Could not update the count.',
    resultCount: (count: number) =>
      count === 1 ? '1 well' : `${new Intl.NumberFormat('en').format(count)} wells`,
    optionsLoading: 'Loading options…',
    optionsError: 'Could not load the fields.',
    field: 'Field',
    operator: 'Operator',
    status: 'Status',
    type: 'Type',
    spudRange: 'Spud year',
    spudFrom: 'From',
    spudTo: 'To',
    allFields: 'All fields',
    allOperators: 'All operators',
    yearPlaceholder: 'YYYY',
  },
  alerts: {
    title: 'Alerts',
    empty: 'No active alerts.',
    loading: 'Loading alerts…',
    loadError: 'Could not load alerts.',
    asOf: 'Data as of',
    level: {
      critical: 'Critical',
      warning: 'Warning',
    },
    kinds: {
      production_drop: 'Production drop',
      high_water_cut: 'High water cut',
      no_production: 'No production',
    },
    detail: {
      oil7d: 'Oil, 7 d',
      oilPrev30: 'Oil, previous 30 d',
      waterCut7d: 'Water cut, 7 d',
      prod3d: 'Production, 3 d',
    },
  },
  importWells: {
    title: 'Your data',
    intro:
      'Import a production CSV with the documented format. The file is validated and stored only in this browser: it is never uploaded to the server.',
    file: 'CSV file',
    units: 'File units',
    unitsSi: 'SI (Sm³, bar)',
    unitsField: 'Oilfield (bbl, Mscf, psi)',
    import: 'Import',
    importing: 'Importing…',
    sourceName: 'User-imported data',
    sourceLicense: 'User data; not redistributed',
    readError: 'Could not read the file. Check that it is a text CSV.',
    saveError: 'Could not save the wells in the browser. Check the available storage.',
    storageUnavailable: 'This browser does not allow IndexedDB, so importing is unavailable.',
    limits:
      'Soft limit: 50 wells and 200,000 rows per file. Above that, importing may be slow and use a lot of storage.',
    softLimit: (wells: number, rows: number) =>
      `The file has ${String(wells)} wells and ${String(rows)} rows. Do you want to continue?`,
    confirmImport: 'Continue',
    cancel: 'Cancel',
    summary: (wells: number, rows: number, skipped: number) =>
      `Imported ${String(rows)} days across ${String(wells)} wells. ${String(skipped)} days were already stored and were skipped.`,
    nothingImported: 'No new days were added.',
    totalRows: (rows: number, invalid: number) =>
      `${String(rows)} rows read; ${String(invalid)} with errors.`,
    errorsTitle: 'Rows with errors',
    errorsTruncated: (shown: number) => `Showing the first ${String(shown)} rows with errors.`,
    line: 'Line',
    reason: 'Reason',
    fatal: {
      empty: 'The file is empty or has no header.',
      missing_columns: (columns: readonly string[]) =>
        `Missing required columns: ${columns.join(', ')}.`,
      no_volume_column:
        'The file must include at least one volume column: oil_sm3, gas_sm3 or water_sm3.',
    },
    error: {
      well_required: 'The well name is missing.',
      well_too_long: 'The well name is longer than 64 characters.',
      invalid_date: 'Invalid date; use YYYY-MM-DD.',
      not_a_number: 'The value is not a number.',
      negative: 'The value cannot be negative.',
      lat_out_of_range: 'Latitude must be between -90 and 90.',
      lon_out_of_range: 'Longitude must be between -180 and 180.',
      on_stream_out_of_range: 'On-stream hours must be between 0 and 24.',
      no_volume: 'The row has no oil, gas or water.',
      coordinates_required: 'The first row of each well must include latitude and longitude.',
      duplicate_date: 'This date is repeated for this well in the file.',
      column_count: 'The row has more cells than the header.',
    },
    listTitle: 'Imported wells',
    empty: 'No imported wells yet.',
    wellSummary: (rows: number, from: string, to: string) =>
      `${String(rows)} days · ${from} – ${to}`,
    open: 'Open',
    delete: 'Delete',
    deleteLabel: (name: string) => `Delete imported well ${name}`,
    clear: 'Delete all imported wells',
    clearConfirm: 'Delete all imported wells from this browser? This action cannot be undone.',
    notice: 'These wells live only in this browser. If you clear the site data, they are lost.',
    shareNote: 'Imported wells cannot be shared by URL.',
  },
  sources: {
    title: 'Sources and licences',
    intro:
      'PetroAtlas does not redistribute third-party data: the ETL downloads it and the database serves it with attribution. These are the sources loaded in this installation.',
    loading: 'Loading sources…',
    loadError: 'Could not load the sources.',
    retry: 'Retry',
    license: 'Licence',
    lastIngest: 'Last ingest',
    neverIngested: 'No ingest recorded',
    syntheticNote:
      'The development dataset includes a synthetic field (SYNTHETIC ALPHA) generated by db/seed. It does not represent a real reservoir.',
    backToMap: 'Back to the map',
  },
  legal: {
    navigation: 'Legal information',
    updated: 'Last updated: 10 November 2026',
    backToMap: 'Back to the map',
    draftNote:
      'This text describes the current state of the project and is not legal advice. Before a public deployment it should be reviewed by a professional and completed with the owner’s legal details.',
    footer: {
      copyright: '© 2026 PetroAtlas. Code under the MIT licence.',
      data: 'Data belongs to its sources.',
    },
    notice: {
      title: 'Legal notice',
      intro:
        'PetroAtlas is an open-source project for information and education. This notice governs access to the application and the use of its contents.',
      sections: [
        {
          title: 'Owner',
          paragraphs: [
            'The owner and maintainer of the project is Luis Angel Gutierrez, whose website is luisangelgutierrez.com and who is based in Venezuela. PetroAtlas is the final name of the project.',
            'The available contact channels are his website and the project’s GitHub repository.',
          ],
          links: [
            {
              href: 'https://luisangelgutierrez.com',
              label: 'Luis Angel Gutierrez’s website',
            },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'PetroAtlas repository',
            },
          ],
        },
        {
          title: 'Purpose',
          paragraphs: [
            'The application lets you consult public oil well data, view production and pressure series and run engineering calculations in the browser.',
            'It is an information and education tool. It does not provide consulting services, does not certify results and does not replace professional judgement.',
          ],
        },
        {
          title: 'Intellectual property',
          paragraphs: [
            'The code is distributed under the MIT licence. You may reuse, modify and redistribute it under the terms of that licence.',
            'Third-party data keeps its own licence and is shown with its source. The repository does not redistribute that data.',
            'Trademarks, field names, operators and other distinctive signs belong to their owners.',
          ],
        },
        {
          title: 'External links',
          paragraphs: [
            'The application links to third-party sources and services. We do not control their content, availability or policies and are not responsible for them.',
          ],
        },
        {
          title: 'Liability',
          paragraphs: [
            'Information may be incomplete, outdated or contain errors. Continuous availability and the accuracy of the data or calculations are not guaranteed.',
            'To the extent permitted by law, the owner is not liable for damages arising from the use of the application or from decisions based on its results.',
          ],
        },
        {
          title: 'Changes and jurisdiction',
          paragraphs: [
            'This notice may be updated when the application or applicable law changes. The update date identifies the current version.',
            'Disputes are subject to the competent courts of Venezuela, without prejudice to mandatory rules that may apply.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy',
      intro:
        'This page explains what data PetroAtlas may process, what it is used for and how to exercise your rights.',
      sections: [
        {
          title: 'Controller',
          paragraphs: [
            'The controller of the project is Luis Angel Gutierrez, whose website is luisangelgutierrez.com and who is based in Venezuela. PetroAtlas is the final name of the project.',
            'For any privacy question, use his website or the project’s GitHub repository.',
          ],
          links: [
            {
              href: 'https://luisangelgutierrez.com',
              label: 'Luis Angel Gutierrez’s website',
            },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'PetroAtlas repository',
            },
          ],
        },
        {
          title: 'Data processed',
          paragraphs: [
            'The application has no user accounts, contact forms or tracking cookies. It stores one technical cookie to remember the chosen language. Names, email addresses and profile data are not collected.',
            'The server hosting the application may record IP addresses, date, requested path, user agent and response code in its access logs. These are technical data needed for security and diagnostics.',
            'The map requests tiles from OpenFreeMap, which receives the IP address and the technical data needed to serve the tiles.',
          ],
        },
        {
          title: 'Purpose and legal basis',
          paragraphs: [
            'Logs are used to keep the service secure, prevent abuse and diagnose failures. The legal basis is the legitimate interest in keeping the service available and secure.',
            'No profiles are built and no automated decisions are made about people.',
          ],
        },
        {
          title: 'Retention',
          paragraphs: [
            'Logs are kept for the time needed for the purposes above and according to the hosting provider’s configuration. They are not kept beyond what is needed for security and diagnostics.',
          ],
        },
        {
          title: 'Recipients',
          paragraphs: [
            'Personal data is not sold or shared. It is accessed only by the hosting provider and the technical services needed, such as the map tile service, each with its own policy.',
          ],
        },
        {
          title: 'Rights',
          paragraphs: [
            'You may request access, rectification, erasure, objection, restriction and portability of your data. To exercise them, contact the owner through his website or the GitHub repository.',
            'You may also lodge a complaint with the competent data protection authority.',
          ],
        },
        {
          title: 'Changes',
          paragraphs: [
            'This policy may be updated when the application or data processing changes. The update date identifies the current version.',
          ],
        },
      ],
    },
    data: {
      title: 'Data',
      intro:
        'PetroAtlas shows public well data and calculates on it in the browser. This page summarises its origin, limits and attribution.',
      sections: [
        {
          title: 'Well data',
          paragraphs: [
            'Field, well, production, pressure and trajectory data come from public sources. Sodir provides the Norwegian continental shelf data; Volve provides the production and trajectory data published by Equinor.',
            'The ETL downloads the data to data/, which Git ignores. The repository does not include or redistribute third-party data.',
          ],
        },
        {
          title: 'Synthetic data',
          paragraphs: [
            'The development dataset includes SYNTHETIC ALPHA, generated by db/seed. It is a fictional dataset and does not represent any real reservoir.',
          ],
        },
        {
          title: 'Calculations',
          paragraphs: [
            'Engineering calculations run in the browser with petro-calc. They are not sent to the API or stored on the server.',
            'Results are estimates based on published correlations and the available data. They do not replace a reservoir study.',
          ],
        },
        {
          title: 'Licences and attribution',
          paragraphs: [
            'Each source keeps its licence. The Sources and licences page shows the sources loaded in this installation and their licence.',
            'Use of the displayed data is governed by each source’s licence. PetroAtlas grants no additional rights over it.',
          ],
          links: [
            { href: '/fuentes', label: 'Sources and licences' },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas/blob/main/docs/10-fuentes-de-datos.md',
              label: 'Source documentation',
            },
            { href: '/aviso-legal', label: 'Legal notice' },
          ],
        },
        {
          title: 'Accuracy',
          paragraphs: [
            'Data may be outdated or incomplete. Before using it in a decision, consult the original source and verify its terms of use.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies',
      intro:
        'This page explains which cookies and similar technologies PetroAtlas uses and how you can manage them.',
      sections: [
        {
          title: 'What they are',
          paragraphs: [
            'Cookies are files a site stores in the browser. Similar technologies also exist, such as local storage and browser databases.',
          ],
        },
        {
          title: 'Cookies we use',
          paragraphs: [
            'PetroAtlas uses one technical cookie, petroatlas-locale, to remember whether you chose Spanish or English. It contains no personal data and is not used for tracking.',
            'It does not use analytics, advertising or third-party tracking cookies. For that reason no cookie consent panel is shown.',
          ],
        },
        {
          title: 'External services',
          paragraphs: [
            'The map loads tiles from OpenFreeMap. That request may include the IP address and technical browser data, but it does not install PetroAtlas cookies.',
          ],
        },
        {
          title: 'Local storage',
          paragraphs: [
            'If you import a CSV, the wells are stored in IndexedDB inside your browser. The file is not sent to the server and that data is not shared with other people. You can delete it from the Your data panel or by clearing the site data in the browser settings.',
          ],
        },
        {
          title: 'How to manage them',
          paragraphs: [
            'You can block or delete cookies in your browser settings. Since no non-essential cookies are used, there is no consent panel to configure.',
          ],
        },
        {
          title: 'Changes',
          paragraphs: [
            'This page may be updated if cookies or similar technologies are added. The update date identifies the current version.',
          ],
        },
      ],
    },
  },
  wellSheet: {
    title: 'Well sheet',
    close: 'Close the well sheet',
    loading: 'Loading the well sheet…',
    loadError: 'Could not load the well sheet.',
    seriesError: 'Could not load the well series.',
    wellsAtPoint: 'Wells at this point',
    tabs: {
      label: 'Well sheet sections',
      summary: 'Sheet',
      production: 'Production',
      operation: 'Operations',
      trajectory: 'Trajectory',
      logs: 'Logs',
      engineering: 'Engineering',
      diagnostics: 'Diagnostics',
    },
    units: {
      legend: 'Units',
      si: 'SI',
      field: 'Oilfield',
    },
    charts: {
      source: 'Source',
      table: 'View table',
      hideTable: 'Hide table',
      date: 'Date',
      zoomHint: 'Drag or scroll on a chart to zoom; the charts stay in sync.',
      noData: 'No data for this chart.',
      loading: 'Loading charts…',
      exportCsv: 'Export CSV',
      exportPng: 'Export PNG',
      tableOf: 'Table of',
    },
    production: {
      noData: 'The source does not publish daily production for this well.',
      rates: 'Production rates',
      waterCutGor: 'Water cut and GOR',
      cumulative: 'Cumulative volumes',
      injection: 'Water injection',
      oil: 'Oil',
      gas: 'Gas',
      water: 'Water',
      waterInj: 'Injected water',
      waterCut: 'Water cut',
      gor: 'GOR',
      cumulativeOil: 'Oil',
      cumulativeGas: 'Gas',
      cumulativeWater: 'Water',
    },
    fit: {
      title: 'Arps fit',
      useView: 'Use visible window',
      clear: 'Remove fit',
      window: 'Window',
      qi: 'qi',
      di: 'Di',
      b: 'b',
      r2: 'R²',
      noFit: 'The window needs at least 6 days with positive production.',
      loadedFrom: 'Calculated from the visible data; the curve is overlaid on the oil rate.',
    },
    engineering: {
      title: 'Engineering',
      model: 'Model',
      vogel: 'Vogel',
      fetkovich: 'Fetkovich',
      composite: 'Composite',
      reservoirPressure: 'Reservoir pressure (bar)',
      flowingPressure: 'Flowing bottom-hole pressure (bar)',
      rate: 'Test rate (Sm³/d)',
      secondFlowingPressure: 'Second flowing pressure (bar)',
      secondRate: 'Second rate (Sm³/d)',
      bubblePoint: 'Bubble point pressure (bar)',
      productivityIndex: 'Productivity index (Sm³/d/bar)',
      ipr: 'IPR curve',
      iprChart: 'Bottom-hole pressure vs rate',
      pvt: 'PVT properties',
      api: 'API gravity',
      gasGravity: 'Gas gravity',
      temperature: 'Temperature (°F)',
      solutionGas: 'Solution gas (scf/STB)',
      standing: 'Standing',
      vasquez: 'Vasquez-Beggs',
      result: 'Result',
      bubble: 'Bubble point pressure',
      formationVolume: 'Formation volume factor',
      viscosity: 'Viscosity',
      pvtBo: 'Bo vs pressure',
      pvtRs: 'Rs vs pressure',
      pvtViscosity: 'Viscosity vs pressure',
      inputError: 'Check the parameters: the correlation cannot be evaluated with these values.',
    },
    diagnostics: {
      title: 'Diagnostics',
      chan: 'Chan: WOR',
      chanDerivative: 'Chan: WOR derivative',
      rateVsCumulative: 'Rate vs cumulative',
      productivityIndex: 'Productivity index',
      reservoirPressure: 'Reservoir pressure (bar)',
      days: 'Days',
      positiveOnly: 'Logarithmic scale: only positive values are drawn.',
      pressureError: 'Reservoir pressure must be greater than zero.',
      noData: 'The source does not publish the series needed for diagnostics.',
      noWater: 'The source does not publish water production for this well.',
      noPressure: 'The source does not publish bottom-hole pressure for this well.',
    },
    trajectory: {
      title: 'Trajectory',
      noData: 'The source does not publish the trajectory of this well.',
      depth: 'Vertical depth',
      displacement: 'Horizontal displacement',
      measuredDepth: 'Measured depth',
      inclination: 'Inclination',
      azimuth: 'Azimuth',
    },
    logs: {
      title: 'Well logs',
      noData: 'The source does not publish logs for this well.',
      loading: 'Loading logs…',
      error: 'Could not load the well logs.',
      depth: 'Depth (m)',
      tracks: 'Log tracks',
      trackLabel: (mnemonic: string, unit: string | null) =>
        unit === null ? mnemonic : `${mnemonic} (${unit})`,
      zoomHint: 'Drag or scroll on a track to zoom in depth; the tracks stay in sync.',
      unavailableForImported: 'Wells imported from CSV do not include logs.',
    },
    comparison: {
      title: 'Well comparison',
      intro:
        'Add other wells from the same field to compare their rates on one chart. Each well uses a different line style and colour still identifies the fluid.',
      selectLabel: 'Well to compare',
      add: 'Add',
      remove: 'Remove',
      noCandidates: 'There are no other wells with daily production in this field.',
      loading: 'Loading field wells…',
      error: 'Could not load the field wells.',
      importedNote:
        'Imported wells exist only in this browser: the comparison is not stored in the URL.',
      shareNote: 'The compared wells are stored in the URL; imported wells cannot be shared.',
      maxReached: (max: number) => `You can compare up to ${String(max)} wells at once.`,
      fluid: 'Fluid',
      chartTitle: 'Compared rates',
    },
    operation: {
      noData: 'The source does not publish operations data for this well.',
      pressures: 'Pressures',
      temperatures: 'Temperatures',
      choke: 'Choke',
      onStream: 'On-stream hours',
      bhp: 'Bottom-hole pressure',
      whp: 'Wellhead pressure',
      bht: 'Bottom-hole temperature',
      wht: 'Wellhead temperature',
      chokeLabel: 'Choke opening',
      onStreamLabel: 'On-stream hours',
    },
    status: 'Status',
    type: 'Type',
    field: 'Field',
    operator: 'Operator',
    spudDate: 'Spud date',
    totalDepth: 'Total depth',
    location: 'Location',
    openInOsm: 'Open in OpenStreetMap',
    series: 'Available series',
    daily: 'Daily production',
    dailyRange: (from: string, to: string, days: number) =>
      `${from} – ${to} (${String(days)} days)`,
    noDaily: 'No daily production',
    trajectoryLabel: 'Trajectory',
    available: 'Available',
    unavailable: 'Not available',
    logCurves: 'Logs',
    noLogs: 'No logs',
    source: 'Source',
    license: 'Licence',
    noData: 'No data',
    exportCsv: 'Download well CSV',
    exportCsvNote: 'Daily SI series, one row per day and the source on every row.',
    importedNotice:
      'Well imported from a CSV in this browser. The data is not on the server and is not shared by URL.',
    importedAlert: 'Alert calculated in the browser with the same rules as public wells.',
  },
  wellStatus: {
    producing: 'Producing',
    injecting: 'Injecting',
    shut_in: 'Shut in',
    abandoned: 'Abandoned',
    unknown: 'Unknown',
  },
  wellType: {
    producer: 'Producer',
    injector: 'Injector',
    exploration: 'Exploration',
    observation: 'Observation',
  },
};
