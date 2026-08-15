'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type StrainCompositionSliderProps = {
    name?: string;
    defaultValue?: number;
    disabled?: boolean;
};

function normalizePercentage(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 50;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

function compositionLabel(sativaPercentage: number): string {
    return `${100 - sativaPercentage}% Indica / ${sativaPercentage}% Sativa`;
}

type CompositionCategory = 'Indica' | 'Hybrid' | 'Sativa';

type RgbColor = {
    red: number;
    green: number;
    blue: number;
};

const COMPOSITION_GRADIENT = {
    indica: '#9333ea',
    hybrid: '#2563eb',
    sativa: '#f97316',
} as const;

function compositionCategory(sativaPercentage: number): CompositionCategory {
    if (sativaPercentage === 50) {
        return 'Hybrid';
    }

    return sativaPercentage > 50 ? 'Sativa' : 'Indica';
}

function hexToRgb(color: string): RgbColor {
    const normalizedColor = color.slice(1);

    return {
        red: Number.parseInt(normalizedColor.slice(0, 2), 16),
        green: Number.parseInt(normalizedColor.slice(2, 4), 16),
        blue: Number.parseInt(normalizedColor.slice(4, 6), 16),
    };
}

function rgbToHex({ red, green, blue }: RgbColor): string {
    return `#${[red, green, blue]
        .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
        .join('')}`;
}

function interpolateColor(startColor: string, endColor: string, amount: number): string {
    const start = hexToRgb(startColor);
    const end = hexToRgb(endColor);

    return rgbToHex({
        red: start.red + (end.red - start.red) * amount,
        green: start.green + (end.green - start.green) * amount,
        blue: start.blue + (end.blue - start.blue) * amount,
    });
}

function colorWithAlpha(color: string, alpha: number): string {
    const { red, green, blue } = hexToRgb(color);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function thumbColorAtPercentage(sativaPercentage: number): string {
    if (sativaPercentage <= 50) {
        return interpolateColor(COMPOSITION_GRADIENT.indica, COMPOSITION_GRADIENT.hybrid, sativaPercentage / 50);
    }

    return interpolateColor(COMPOSITION_GRADIENT.hybrid, COMPOSITION_GRADIENT.sativa, (sativaPercentage - 50) / 50);
}

export function StrainCompositionSlider({
    name = 'sativa_percentage',
    defaultValue,
    disabled = false,
}: StrainCompositionSliderProps): React.ReactElement {
    const [sativaPercentage, setSativaPercentage] = useState(() => normalizePercentage(defaultValue));
    const indicaPercentage = 100 - sativaPercentage;
    const composition = compositionCategory(sativaPercentage);
    const thumbColor = thumbColorAtPercentage(sativaPercentage);
    const badgeText = `${indicaPercentage}/${sativaPercentage} ${composition}`;
    const badgeStyle = {
        backgroundColor: colorWithAlpha(thumbColor, 0.14),
        color: thumbColor,
        boxShadow: `inset 0 0 0 1px ${colorWithAlpha(thumbColor, 0.28)}`,
    } satisfies React.CSSProperties;

    return (
        <div data-slot='control' className={cn('rounded-lg border border-zinc-950/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5', disabled && 'opacity-50')}>
            <div className='flex items-center justify-between gap-3 text-sm/6 font-semibold'>
                <span className='text-purple-700 dark:text-purple-300'>Indica</span>
                <span className='rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset' style={badgeStyle}>
                    {badgeText}
                </span>
                <span className='text-orange-600 dark:text-orange-300'>Sativa</span>
            </div>
            <div className='mt-5'>
                <input
                    type='range'
                    name={name}
                    min={0}
                    max={100}
                    step={10}
                    value={sativaPercentage}
                    disabled={disabled}
                    aria-label='Strain composition'
                    aria-valuetext={compositionLabel(sativaPercentage)}
                    onChange={(event) => setSativaPercentage(normalizePercentage(Number(event.currentTarget.value)))}
                    className='h-3 w-full cursor-pointer appearance-none rounded-full bg-transparent focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--composition-thumb)] [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--composition-thumb)] [&::-webkit-slider-thumb]:shadow-md'
                    style={{
                        background: `linear-gradient(90deg, ${COMPOSITION_GRADIENT.indica} 0%, ${COMPOSITION_GRADIENT.hybrid} 50%, ${COMPOSITION_GRADIENT.sativa} 100%)`,
                        accentColor: thumbColor,
                        '--composition-thumb': thumbColor,
                    } as React.CSSProperties}
                />
            </div>
        </div>
    );
}
