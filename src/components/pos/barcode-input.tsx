'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import { cn } from '@/lib/utils';

interface BarcodeInputProps {
  onScan: (codigo: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Pause the auto-refocus interval (e.g. when a modal is open) */
  pauseRefocus?: boolean;
}

export interface BarcodeInputRef {
  focus: () => void;
  blur: () => void;
}

const SCAN_CHAR_THRESHOLD_MS = 30;
const DEBOUNCE_SAME_CODE_MS = 300;
const REFOCUS_INTERVAL_MS = 500;

export const BarcodeInput = forwardRef<BarcodeInputRef, BarcodeInputProps>(
  function BarcodeInput(
    {
      onScan,
      autoFocus = true,
      disabled = false,
      placeholder = 'Escaneá un código de barras…',
      className,
      pauseRefocus = false,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const bufferRef = useRef('');
    const lastKeystrokeRef = useRef(0);
    const isScanningRef = useRef(false);
    const lastScannedRef = useRef<{ code: string; ts: number }>({
      code: '',
      ts: 0,
    });

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    // Auto-refocus interval
    useEffect(() => {
      if (!autoFocus || disabled || pauseRefocus) return;
      const id = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, REFOCUS_INTERVAL_MS);
      return () => clearInterval(id);
    }, [autoFocus, disabled, pauseRefocus]);

    const handleSubmit = useCallback(() => {
      const code = bufferRef.current.trim();
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';

      if (!code) return;

      const now = Date.now();
      if (
        code === lastScannedRef.current.code &&
        now - lastScannedRef.current.ts < DEBOUNCE_SAME_CODE_MS
      ) {
        return;
      }

      lastScannedRef.current = { code, ts: now };
      onScan(code);
    }, [onScan]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          handleSubmit();
          return;
        }

        const now = Date.now();
        const delta = now - lastKeystrokeRef.current;
        lastKeystrokeRef.current = now;

        if (delta < SCAN_CHAR_THRESHOLD_MS) {
          isScanningRef.current = true;
        }
      },
      [handleSubmit],
    );

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLInputElement>) => {
        bufferRef.current = (e.target as HTMLInputElement).value;
      },
      [],
    );

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-lg ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
      />
    );
  },
);
