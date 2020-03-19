import React, { useRef, useEffect } from 'react';
import { TextArea, ITextAreaProps } from '@blueprintjs/core';


export const AutoSizedTextArea: React.FC<ITextAreaProps> = function (props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      adjustTextareaHeight(entries[0].target as HTMLTextAreaElement);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    } else {
      throw new Error("Failed to add auto-sized textarea component to elements observed for resize");
    }

    return function cleanup() {
      resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (ref.current) {
      adjustTextareaHeight(ref.current);
    }
  }, [props.value]);

  return <TextArea {...props} inputRef={(el) => ref.current = el} />;
};


function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = '';
  el.style.height = `${el.scrollHeight + 3}px`;
}