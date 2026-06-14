"use client";

import { useEffect, useState } from "react";

export interface PresenterLike<S> {
  getState(): S;
  subscribe(listener: () => void): () => void;
}

export function usePresenterSnapshot<S>(presenter: PresenterLike<S>): S {
  const [state, setState] = useState(presenter.getState());

  useEffect(() => {
    return presenter.subscribe(() => setState(presenter.getState()));
  }, [presenter]);

  return state;
}
