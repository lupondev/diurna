export function injectWidgets(
  tiptapContent: Record<string, unknown>,
  _categoryConfig: {
    widgetPoll: boolean
    widgetQuiz: boolean
    widgetStats: boolean
    widgetPlayer: boolean
    widgetVideo: boolean
    widgetGallery: boolean
  }
): Record<string, unknown> {
  // DISABLED: Widgets are injected with empty attrs (no question, no options, no data)
  // which renders as broken placeholder boxes on the frontend.
  // TODO: Re-enable when AI prompt generates actual widget content.
  return tiptapContent
}
