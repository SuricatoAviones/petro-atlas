/** Interface texts in Spanish, kept in one place so they can be translated (docs/12). */
export const messages = {
  app: {
    name: 'PetroAtlas',
    tagline: 'Explorador de pozos petroleros',
    description:
      'Mapa de pozos petroleros con series de producción y presión y herramientas de ingeniería.',
    navigation: 'Navegación principal',
    map: 'Mapa',
    sources: 'Fuentes y licencias',
  },
  map: {
    label: 'Mapa de pozos',
    loading: 'Cargando el mapa base…',
    loadError: 'No se pudo cargar el mapa base. Revisa la conexión y recarga la página.',
    dataError: 'No se pudieron cargar los pozos. Inténtalo de nuevo en unos minutos.',
    colorMode: {
      legend: 'Color de los pozos',
      status: 'Estado',
      type: 'Tipo',
    },
    legend: {
      title: 'Leyenda',
      cluster: 'Grupo de pozos',
      field: 'Campo',
      unknownType: 'Sin tipo',
    },
    bubbles: {
      title: 'Mapa de burbujas',
      none: 'Sin burbujas',
      oil: 'Petróleo',
      gas: 'Gas',
      water: 'Agua',
      legend: 'Volumen acumulado',
      loading: 'Cargando los acumulados…',
      loadError: 'No se pudieron cargar los acumulados.',
    },
    /** Overrides for MapLibre's built-in control texts. */
    controls: {
      'NavigationControl.ZoomIn': 'Acercar',
      'NavigationControl.ZoomOut': 'Alejar',
      'NavigationControl.ResetBearing': 'Orientar al norte',
      'AttributionControl.ToggleAttribution': 'Mostrar u ocultar atribución',
      'ScaleControl.Meters': 'm',
      'ScaleControl.Kilometers': 'km',
    },
  },
  filters: {
    label: 'Filtros de pozos',
    title: 'Filtros',
    reset: 'Quitar filtros',
    loading: 'Actualizando el conteo…',
    countError: 'No se pudo actualizar el conteo.',
    resultCount: (count: number) =>
      count === 1 ? '1 pozo' : `${new Intl.NumberFormat('es').format(count)} pozos`,
    optionsLoading: 'Cargando opciones…',
    optionsError: 'No se pudieron cargar los campos.',
    field: 'Campo',
    operator: 'Operadora',
    status: 'Estado',
    type: 'Tipo',
    spudRange: 'Año de perforación',
    spudFrom: 'Desde',
    spudTo: 'Hasta',
    allFields: 'Todos los campos',
    allOperators: 'Todas las operadoras',
    yearPlaceholder: 'AAAA',
  },
  alerts: {
    title: 'Alertas',
    empty: 'Sin alertas activas.',
    loading: 'Cargando alertas…',
    loadError: 'No se pudieron cargar las alertas.',
    asOf: 'Datos al',
    level: {
      critical: 'Crítica',
      warning: 'Advertencia',
    },
    kinds: {
      production_drop: 'Caída de producción',
      high_water_cut: 'Corte de agua alto',
      no_production: 'Sin producción',
    },
    detail: {
      oil7d: 'Petróleo 7 d',
      oilPrev30: 'Petróleo 30 d previos',
      waterCut7d: 'Corte de agua 7 d',
      prod3d: 'Producción 3 d',
    },
  },
  sources: {
    title: 'Fuentes y licencias',
    intro:
      'PetroAtlas no redistribuye datos de terceros: el ETL los descarga y la base de datos los sirve con su atribución. Estas son las fuentes cargadas en esta instalación.',
    loading: 'Cargando las fuentes…',
    loadError: 'No se pudieron cargar las fuentes.',
    retry: 'Reintentar',
    license: 'Licencia',
    lastIngest: 'Última ingesta',
    neverIngested: 'Sin ingesta registrada',
    syntheticNote:
      'El conjunto de desarrollo incluye un campo sintético (SYNTHETIC ALPHA) generado por db/seed. No representa un yacimiento real.',
    backToMap: 'Volver al mapa',
  },
  legal: {
    navigation: 'Información legal',
    updated: 'Última actualización: 10 de noviembre de 2026',
    backToMap: 'Volver al mapa',
    draftNote:
      'Este texto describe el estado actual del proyecto y no constituye asesoramiento jurídico. Antes de una explotación pública debe revisarlo un profesional y completarse con los datos legales del titular.',
    footer: {
      copyright: '© 2026 PetroAtlas. Código bajo licencia MIT.',
      data: 'Los datos pertenecen a sus fuentes.',
    },
    notice: {
      title: 'Aviso legal',
      intro:
        'PetroAtlas es un proyecto de código abierto de carácter informativo y educativo. Este aviso regula el acceso a la aplicación y el uso de sus contenidos.',
      sections: [
        {
          title: 'Titular',
          paragraphs: [
            'El titular y mantenedor del proyecto es LuisAngel, la persona que figura en el aviso de copyright del archivo LICENSE del repositorio. El nombre PetroAtlas es provisional.',
            'La vía de contacto disponible es el repositorio del proyecto en GitHub.',
          ],
          links: [
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'Repositorio de PetroAtlas',
            },
          ],
        },
        {
          title: 'Objeto',
          paragraphs: [
            'La aplicación permite consultar datos públicos de pozos petroleros, ver series de producción y presión y ejecutar cálculos de ingeniería en el navegador.',
            'Es una herramienta informativa y educativa. No presta servicios de consultoría, no certifica resultados y no sustituye el criterio de un profesional.',
          ],
        },
        {
          title: 'Propiedad intelectual',
          paragraphs: [
            'El código se distribuye bajo licencia MIT. Puedes reutilizarlo, modificarlo y redistribuirlo con las condiciones de esa licencia.',
            'Los datos de terceros conservan sus propias licencias y se muestran con su fuente. El repositorio no redistribuye esos datos.',
            'Las marcas, los nombres de campos, las operadoras y los demás signos distintivos pertenecen a sus titulares.',
          ],
        },
        {
          title: 'Enlaces externos',
          paragraphs: [
            'La aplicación enlaza a fuentes y servicios de terceros. No controlamos su contenido, disponibilidad ni políticas, y no respondemos de ellos.',
          ],
        },
        {
          title: 'Responsabilidad',
          paragraphs: [
            'La información puede estar incompleta, desactualizada o contener errores. No se garantiza la disponibilidad continua ni la exactitud de los datos o de los cálculos.',
            'En la medida en que la ley lo permita, el titular no responde de los daños derivados del uso de la aplicación ni de las decisiones tomadas a partir de sus resultados.',
          ],
        },
        {
          title: 'Modificaciones',
          paragraphs: [
            'Este aviso puede actualizarse cuando cambie la aplicación o la normativa aplicable. La fecha de actualización indica la versión vigente.',
            'Las controversias se someterán a los tribunales que resulten competentes según la normativa aplicable.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacidad',
      intro:
        'Esta página explica qué datos puede tratar PetroAtlas, para qué se usan y cómo ejercer tus derechos.',
      sections: [
        {
          title: 'Responsable',
          paragraphs: [
            'El responsable del proyecto es LuisAngel, la persona que figura en el aviso de copyright del archivo LICENSE del repositorio. El nombre PetroAtlas es provisional.',
            'Para cualquier consulta sobre privacidad, utiliza el repositorio del proyecto en GitHub.',
          ],
          links: [
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas',
              label: 'Repositorio de PetroAtlas',
            },
          ],
        },
        {
          title: 'Datos que se tratan',
          paragraphs: [
            'La aplicación no tiene cuentas de usuario, formularios de contacto ni cookies. No se recogen nombres, correos electrónicos ni datos de perfil.',
            'El servidor que aloja la aplicación puede registrar direcciones IP, fecha, ruta solicitada, agente de usuario y código de respuesta en sus registros de acceso. Son datos técnicos necesarios para la seguridad y el diagnóstico.',
            'El mapa solicita teselas a OpenFreeMap, que recibe la dirección IP y los datos técnicos necesarios para servir las teselas.',
          ],
        },
        {
          title: 'Finalidad y base jurídica',
          paragraphs: [
            'Los registros se usan para mantener la seguridad, prevenir abusos y diagnosticar fallos. La base jurídica es el interés legítimo en mantener el servicio disponible y seguro.',
            'No se elaboran perfiles ni se toman decisiones automatizadas sobre las personas.',
          ],
        },
        {
          title: 'Conservación',
          paragraphs: [
            'Los registros se conservan el tiempo necesario para las finalidades anteriores y según la configuración del proveedor de alojamiento. No se conservan más allá de lo necesario para la seguridad y el diagnóstico.',
          ],
        },
        {
          title: 'Destinatarios',
          paragraphs: [
            'No se venden ni se ceden datos personales. Solo acceden a ellos el proveedor de alojamiento y los servicios técnicos necesarios, como el servicio de teselas del mapa, cada uno con su propia política.',
          ],
        },
        {
          title: 'Derechos',
          paragraphs: [
            'Puedes solicitar el acceso, la rectificación, la supresión, la oposición, la limitación y la portabilidad de tus datos. Para ejercerlos, contacta a través del repositorio de GitHub.',
            'También puedes presentar una reclamación ante la autoridad de protección de datos competente.',
          ],
        },
        {
          title: 'Cambios',
          paragraphs: [
            'Esta política puede actualizarse cuando cambie la aplicación o el tratamiento de datos. La fecha de actualización indica la versión vigente.',
          ],
        },
      ],
    },
    data: {
      title: 'Datos',
      intro:
        'PetroAtlas muestra datos públicos de pozos y calcula sobre ellos en el navegador. Esta página resume su origen, sus límites y cómo se atribuyen.',
      sections: [
        {
          title: 'Datos de pozos',
          paragraphs: [
            'Los datos de campos, pozos, producción, presión y trayectorias proceden de fuentes públicas. Sodir aporta los datos de la plataforma noruega; Volve, los datos de producción y trayectorias publicados por Equinor.',
            'El ETL descarga los datos a data/, que Git ignora. El repositorio no incluye ni redistribuye datos de terceros.',
          ],
        },
        {
          title: 'Datos sintéticos',
          paragraphs: [
            'El conjunto de desarrollo incluye SYNTHETIC ALPHA, generado por db/seed. Es un conjunto ficticio y no representa ningún yacimiento real.',
          ],
        },
        {
          title: 'Cálculos',
          paragraphs: [
            'Los cálculos de ingeniería se ejecutan en el navegador con petro-calc. No se envían a la API ni se almacenan en el servidor.',
            'Los resultados son estimaciones basadas en correlaciones publicadas y en los datos disponibles. No sustituyen un estudio de yacimiento.',
          ],
        },
        {
          title: 'Licencias y atribución',
          paragraphs: [
            'Cada fuente conserva su licencia. La página Fuentes y licencias muestra las fuentes cargadas en esta instalación y su licencia.',
            'El uso de los datos mostrados se rige por la licencia de cada fuente. PetroAtlas no concede derechos adicionales sobre ellos.',
          ],
          links: [
            { href: '/fuentes', label: 'Fuentes y licencias' },
            {
              href: 'https://github.com/SuricatoAviones/petro-atlas/blob/main/docs/10-fuentes-de-datos.md',
              label: 'Documentación de las fuentes',
            },
            { href: '/aviso-legal', label: 'Aviso legal' },
          ],
        },
        {
          title: 'Exactitud',
          paragraphs: [
            'Los datos pueden estar desactualizados o incompletos. Antes de usarlos en una decisión, consulta la fuente original y verifica sus condiciones de uso.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies',
      intro:
        'Esta página explica qué cookies y tecnologías similares usa PetroAtlas y cómo puedes gestionarlas.',
      sections: [
        {
          title: 'Qué son',
          paragraphs: [
            'Las cookies son archivos que un sitio guarda en el navegador. También existen tecnologías similares, como el almacenamiento local y las bases de datos del navegador.',
          ],
        },
        {
          title: 'Cookies que usamos',
          paragraphs: [
            'Actualmente PetroAtlas no utiliza cookies propias ni de terceros, ni herramientas de analítica, publicidad o seguimiento.',
            'Por ese motivo no se muestra un panel de consentimiento de cookies.',
          ],
        },
        {
          title: 'Servicios externos',
          paragraphs: [
            'El mapa carga teselas de OpenFreeMap. Esa petición puede incluir la dirección IP y datos técnicos del navegador, pero no instala cookies de PetroAtlas.',
          ],
        },
        {
          title: 'Almacenamiento local',
          paragraphs: [
            'La aplicación no usa almacenamiento local en esta versión. La importación de CSV prevista utilizará IndexedDB solo en el navegador y no enviará el archivo al servidor; esta página se actualizará antes de activar esa función.',
          ],
        },
        {
          title: 'Cómo gestionarlas',
          paragraphs: [
            'Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Como no se usan cookies no esenciales, no hay un panel de consentimiento que configurar.',
          ],
        },
        {
          title: 'Cambios',
          paragraphs: [
            'Esta página puede actualizarse si se añaden cookies o tecnologías similares. La fecha de actualización indica la versión vigente.',
          ],
        },
      ],
    },
  },
  wellSheet: {
    title: 'Ficha del pozo',
    close: 'Cerrar la ficha',
    loading: 'Cargando la ficha…',
    loadError: 'No se pudo cargar la ficha del pozo.',
    seriesError: 'No se pudieron cargar las series del pozo.',
    wellsAtPoint: 'Pozos en este punto',
    tabs: {
      label: 'Secciones de la ficha',
      summary: 'Ficha',
      production: 'Producción',
      operation: 'Operación',
      trajectory: 'Trayectoria',
      engineering: 'Ingeniería',
      diagnostics: 'Diagnóstico',
    },
    units: {
      legend: 'Unidades',
      si: 'SI',
      field: 'Campo',
    },
    charts: {
      source: 'Fuente',
      table: 'Ver tabla',
      hideTable: 'Ocultar tabla',
      date: 'Fecha',
      zoomHint: 'Arrastra o rueda sobre una gráfica para hacer zoom; las gráficas se sincronizan.',
      noData: 'Sin datos para esta gráfica.',
      loading: 'Cargando las gráficas…',
    },
    production: {
      noData: 'La fuente no publica producción diaria para este pozo.',
      rates: 'Tasas de producción',
      waterCutGor: 'Corte de agua y RGP',
      cumulative: 'Volúmenes acumulados',
      injection: 'Inyección de agua',
      oil: 'Petróleo',
      gas: 'Gas',
      water: 'Agua',
      waterInj: 'Agua inyectada',
      waterCut: 'Corte de agua',
      gor: 'RGP',
      cumulativeOil: 'Petróleo',
      cumulativeGas: 'Gas',
      cumulativeWater: 'Agua',
    },
    fit: {
      title: 'Ajuste de Arps',
      useView: 'Usar la ventana visible',
      clear: 'Quitar ajuste',
      window: 'Ventana',
      qi: 'qi',
      di: 'Di',
      b: 'b',
      r2: 'R²',
      noFit: 'La ventana necesita al menos 6 días con producción positiva.',
      loadedFrom: 'Calculado con los datos visibles; la curva se superpone a la tasa de petróleo.',
    },
    engineering: {
      title: 'Ingeniería',
      model: 'Modelo',
      vogel: 'Vogel',
      fetkovich: 'Fetkovich',
      composite: 'Compuesta',
      reservoirPressure: 'Presión de yacimiento (bar)',
      flowingPressure: 'Presión de fondo fluyente (bar)',
      rate: 'Caudal de prueba (Sm³/d)',
      secondFlowingPressure: 'Segunda presión fluyente (bar)',
      secondRate: 'Segundo caudal (Sm³/d)',
      bubblePoint: 'Presión de burbuja (bar)',
      productivityIndex: 'Índice de productividad (Sm³/d/bar)',
      ipr: 'Curva IPR',
      iprChart: 'Presión de fondo frente a caudal',
      pvt: 'Propiedades PVT',
      api: 'Gravedad API',
      gasGravity: 'Gravedad del gas',
      temperature: 'Temperatura (°F)',
      solutionGas: 'Gas en solución (scf/STB)',
      standing: 'Standing',
      vasquez: 'Vasquez-Beggs',
      result: 'Resultado',
      bubble: 'Presión de burbuja',
      formationVolume: 'Factor volumétrico',
      viscosity: 'Viscosidad',
      pvtBo: 'Bo frente a presión',
      pvtRs: 'Rs frente a presión',
      pvtViscosity: 'Viscosidad frente a presión',
      inputError: 'Revisa los parámetros: la correlación no puede evaluarse con estos valores.',
    },
    diagnostics: {
      title: 'Diagnóstico',
      chan: 'Chan: RAP',
      chanDerivative: 'Chan: derivada del RAP',
      rateVsCumulative: 'Tasa frente a acumulado',
      productivityIndex: 'Índice de productividad',
      reservoirPressure: 'Presión de yacimiento (bar)',
      days: 'Días',
      positiveOnly: 'Escala logarítmica: solo se dibujan los valores positivos.',
      pressureError: 'La presión de yacimiento debe ser mayor que cero.',
      noData: 'La fuente no publica las series necesarias para el diagnóstico.',
      noWater: 'La fuente no publica la producción de agua de este pozo.',
      noPressure: 'La fuente no publica la presión de fondo de este pozo.',
    },
    trajectory: {
      title: 'Trayectoria',
      noData: 'La fuente no publica la trayectoria de este pozo.',
      depth: 'Profundidad vertical',
      displacement: 'Desplazamiento horizontal',
      measuredDepth: 'Profundidad medida',
      inclination: 'Inclinación',
      azimuth: 'Azimut',
    },
    operation: {
      noData: 'La fuente no publica datos de operación para este pozo.',
      pressures: 'Presiones',
      temperatures: 'Temperaturas',
      choke: 'Choke',
      onStream: 'Horas en línea',
      bhp: 'Presión de fondo',
      whp: 'Presión de cabecera',
      bht: 'Temperatura de fondo',
      wht: 'Temperatura de cabecera',
      chokeLabel: 'Apertura de choke',
      onStreamLabel: 'Horas en línea',
    },
    status: 'Estado',
    type: 'Tipo',
    field: 'Campo',
    operator: 'Operadora',
    spudDate: 'Fecha de perforación',
    totalDepth: 'Profundidad total',
    location: 'Ubicación',
    openInOsm: 'Abrir en OpenStreetMap',
    series: 'Series disponibles',
    daily: 'Producción diaria',
    dailyRange: (from: string, to: string, days: number) =>
      `${from} – ${to} (${String(days)} días)`,
    noDaily: 'Sin producción diaria',
    trajectoryLabel: 'Trayectoria',
    available: 'Disponible',
    unavailable: 'No disponible',
    logCurves: 'Registros',
    noLogs: 'Sin registros',
    source: 'Fuente',
    license: 'Licencia',
    noData: 'Sin dato',
  },
  wellStatus: {
    producing: 'Produciendo',
    injecting: 'Inyectando',
    shut_in: 'Cerrado',
    abandoned: 'Abandonado',
    unknown: 'Desconocido',
  },
  wellType: {
    producer: 'Productor',
    injector: 'Inyector',
    exploration: 'Exploración',
    observation: 'Observación',
  },
} as const;
