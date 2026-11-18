/**
 * Schema state reducer with undo/redo history.
 * Actions: LOAD (fresh, no history), APPLY (tracked), UNDO, REDO, PATCH_META
 */
export const MAX_HISTORY = 60;

export function schemaReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return { schema: action.schema, past: [], future: [], savedAt: action.savedAt || Date.now() };

    case "APPLY": {
      const past = [...state.past, state.schema].slice(-MAX_HISTORY);
      return { schema: action.schema, past, future: [], savedAt: state.savedAt };
    }

    case "UNDO": {
      if (!state.past.length) return state;
      const schema = state.past[state.past.length - 1];
      return {
        schema,
        past: state.past.slice(0, -1),
        future: [state.schema, ...state.future].slice(0, MAX_HISTORY),
        savedAt: state.savedAt,
      };
    }

    case "REDO": {
      if (!state.future.length) return state;
      const schema = state.future[0];
      return {
        schema,
        past: [...state.past, state.schema].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        savedAt: state.savedAt,
      };
    }

    default:
      return state;
  }
}
