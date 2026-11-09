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
} as const;
