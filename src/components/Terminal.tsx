import { useEffect, useRef, useState, type KeyboardEvent, type FormEvent } from 'react';
import { LuTerminal, LuCornerDownLeft } from 'react-icons/lu';
import type { TermLine } from '../game/types';
import { MAX_INPUT_LENGTH } from '../game/engine';

interface Props {
  lines: TermLine[];
  history: string[];
  onRun: (input: string) => void;
  quick: string[];
  prefill?: { text: string; nonce: number };
  /** 入力欄にフォーカスがあるか（スマホのキーボード表示中の判定用） */
  onFocusChange?: (focused: boolean) => void;
}

export function Terminal({ lines, history, onRun, quick, prefill, onFocusChange }: Props) {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (prefill) {
      setInput(prefill.text);
      setCursor(null);
      inputRef.current?.focus();
    }
  }, [prefill]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onRun(input);
    setInput('');
    setCursor(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      if (cursor === null) return;
      e.preventDefault();
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setInput('');
      } else {
        setCursor(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <div className="terminal panel">
      <div className="panel-head">
        <span className="panel-title"><LuTerminal aria-hidden /> TERMINAL</span>
        <span className="mono dim small">zero@lab — 仮想シェル</span>
      </div>
      <div className="term-screen" ref={scrollRef} aria-live="polite" onClick={() => inputRef.current?.focus()}>
        {lines.length === 0 && <div className="term-line tone-muted">（表示を消去しました）</div>}
        {lines.map((l, i) => (
          <div key={i} className={`term-line tone-${l.tone}`}>
            {l.text || ' '}
          </div>
        ))}
      </div>
      <form className="term-input" onSubmit={submit}>
        <label htmlFor="term-input" className="prompt mono">zero@lab:~$</label>
        <input
          id="term-input"
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setCursor(null);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          maxLength={MAX_INPUT_LENGTH}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="コマンドを入力（help で一覧）"
        />
        <button type="submit" className="btn btn-primary btn-run" aria-label="実行">
          <LuCornerDownLeft aria-hidden /> <span>実行</span>
        </button>
      </form>
      <div className="quick" aria-label="よく使うコマンド">
        {quick.map((q) => (
          <button key={q} type="button" className="quick-btn mono" onClick={() => onRun(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
