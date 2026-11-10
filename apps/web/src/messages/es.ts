/** Interface texts in Spanish, kept in one place so they can be translated (docs/12). */
export const messages = {
  app: {
    name: 'PetroAtlas',
    tagline: 'Explorador de pozos petroleros',
    description:
      'Mapa de pozos petroleros con series de producción y presión y herramientas de ingeniería.',
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
