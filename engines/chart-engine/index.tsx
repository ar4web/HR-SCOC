'use client';

import React from 'react';
import type ApexCharts from 'apexcharts';
import { useChartTheme } from '@/lib/chart-theme';

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'donut'
  | 'pie'
  | 'radialBar';

export interface ChartSeries {
  name?: string;
  data: number[] | number;
}

interface ChartEngineProps {
  type: ChartType;
  series: ChartSeries[] | number[];
  categories?: string[];
  labels?: string[];
  height?: number | string;
  width?: number | string;
  colors?: string[];
  donutSize?: string;
  stacked?: boolean;
  showLegend?: boolean;
  showToolbar?: boolean;
  showDataLabels?: boolean;
  fillOpacity?: number;
  fontSize?: string;
  dir?: 'ltr' | 'rtl';
  locale?: 'en' | 'ar';
  className?: string;
}

type ApexOptions = ApexCharts.ApexOptions;

const FALLBACK_PALETTE = ['#1B3A5F', '#1F7A4D', '#C4A35A', '#2B5F8A', '#B07A16', '#B23A32', '#8B95A8'];

const FONT_FAMILY: Record<string, string> = {
  en: 'Inter, system-ui, sans-serif',
  ar: 'Cairo, system-ui, sans-serif',
};

let ApexCtor: typeof ApexCharts | null = null;
let loadPromise: Promise<typeof ApexCharts> | null = null;

function getApex(): Promise<typeof ApexCharts> {
  if (ApexCtor) return Promise.resolve(ApexCtor);
  if (!loadPromise) {
    loadPromise = import('apexcharts').then((m) => {
      ApexCtor = m.default;
      return ApexCtor;
    });
  }
  return loadPromise;
}

const EN_LOCALE = {
  name: 'en',
  options: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    decimal: '.',
    thousands: ',',
  },
};

const AR_LOCALE = {
  name: 'ar',
  options: {
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    shortMonths: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    shortDays: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    decimal: '.',
    thousands: ',',
  },
};

const LOCALES: Record<string, NonNullable<NonNullable<ApexOptions['chart']>['locales']>> = {
  en: [EN_LOCALE],
  ar: [AR_LOCALE],
};

function buildOptions(props: ChartEngineProps, palette: string[], muted: string, line: string): ApexOptions {
  const {
    type,
    series,
    categories,
    labels,
    height = 300,
    width,
    colors = palette,
    donutSize = '60%',
    stacked = false,
    showLegend = true,
    showToolbar = false,
    showDataLabels = false,
    fillOpacity = 0.85,
    fontSize = '13px',
    dir = 'ltr',
    locale = 'en',
  } = props;

  const isPieLike = type === 'pie' || type === 'donut' || type === 'radialBar';

  const commonOptions: ApexOptions = {
    chart: {
      type,
      height,
      width,
      foreColor: muted,
      fontFamily: FONT_FAMILY[locale] || FONT_FAMILY.en,
      toolbar: { show: showToolbar },
      stacked,
      animations: { enabled: true, speed: 300 },
      parentHeightOffset: 0,
      defaultLocale: locale,
      locales: LOCALES[locale] || LOCALES.en,
    },
    colors,
    stroke: {
      curve: 'smooth',
      width: type === 'line' || type === 'area' ? 2 : type === 'bar' ? 0 : 1,
    },
    grid: {
      borderColor: line,
      strokeDashArray: 3,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    dataLabels: { enabled: showDataLabels },
    fill: (type === 'bar' || isPieLike)
      ? { type: 'solid' as const, opacity: 1 }
      : { type: 'gradient' as const, gradient: { shadeIntensity: 0.5, opacityFrom: fillOpacity, opacityTo: 0.6 }, opacity: fillOpacity },
    legend: {
      show: showLegend,
      position: 'bottom',
      horizontalAlign: dir === 'rtl' ? 'left' : 'center',
      fontSize,
      labels: { colors: muted },
      markers: { size: 4 },
    },
    tooltip: { theme: 'light' },
    noData: {
      text: locale === 'ar' ? 'لا توجد بيانات' : 'No data available',
      style: { fontSize },
    },
    series: series as unknown as ApexOptions['series'],
  };

  if (isPieLike) {
    return {
      ...commonOptions,
      labels,
      fill: { type: 'solid', opacity: 1 },
      plotOptions: {
        pie: {
          donut: { size: donutSize, labels: { show: true, name: { fontSize }, value: { fontSize } } },
          expandOnClick: true,
        },
      },
      responsive: [{ breakpoint: 480, options: { chart: { width: 300 } } }],
    };
  }

  return {
    ...commonOptions,
    xaxis: {
      categories,
      labels: { style: { fontSize } },
    },
    yaxis: { labels: { style: { fontSize } } },
    ...(type === 'bar'
      ? { plotOptions: { bar: { borderRadius: 0, columnWidth: '55%', distributed: false } } }
      : {}),
  };
}

export function Chart(props: ChartEngineProps) {
  const { dir = 'ltr', className, height = 300, width } = props;
  const theme = useChartTheme();
  const palette = theme.palette.length ? theme.palette : FALLBACK_PALETTE;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<ApexCharts | null>(null);
  const generationRef = React.useRef(0);
  const [failed, setFailed] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const dataFingerprint = React.useMemo(
    () =>
      JSON.stringify([
        props.type,
        props.series,
        props.categories,
        props.labels,
        props.colors,
        props.height,
        props.width,
        props.donutSize,
        props.stacked,
        props.showLegend,
        props.showToolbar,
        props.showDataLabels,
        props.fillOpacity,
        props.fontSize,
        props.dir,
        props.locale,
        palette,
        theme.muted,
        theme.line,
      ]),
    [
      props.type,
      props.series,
      props.categories,
      props.labels,
      props.colors,
      props.height,
      props.width,
      props.donutSize,
      props.stacked,
      props.showLegend,
      props.showToolbar,
      props.showDataLabels,
      props.fillOpacity,
      props.fontSize,
      props.dir,
      props.locale,
      palette,
      theme.muted,
      theme.line,
    ]
  );

  React.useEffect(() => {
    return () => {
      generationRef.current += 1;
      const instance = instanceRef.current;
      instanceRef.current = null;
      if (instance) {
        try {
          instance.destroy();
        } catch {
          // ignore destroy errors
        }
      }
    };
  }, []);

  React.useEffect(() => {
    const generation = ++generationRef.current;
    let disposed = false;
    let myInstance: ApexCharts | null = null;
    setFailed(false);
    setReady(false);

    getApex()
      .then((Apex) => {
        if (disposed || generation !== generationRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        el.innerHTML = '';
        myInstance = new Apex(el, buildOptions(props, palette, theme.muted, theme.line));
        instanceRef.current = myInstance;
        return myInstance.render();
      })
      .then(() => {
        if (generation === generationRef.current) {
          setReady(true);
        } else if (instanceRef.current === myInstance) {
          instanceRef.current = null;
        }
        myInstance = null;
      })
      .catch((err) => {
        if (generation === generationRef.current) {
          console.error('[Chart] failed to render:', err);
          setFailed(true);
        }
      });

    return () => {
      disposed = true;
      if (generation === generationRef.current) {
        const curr = instanceRef.current;
        instanceRef.current = null;
        if (curr && curr === myInstance) {
          try {
            curr.destroy();
          } catch {
            // ignore
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFingerprint]);

  return (
    <div className={className} dir={dir}>
      <div ref={containerRef} style={{ width, height }} />
      {failed && !ready && (
        <div className="flex items-center justify-center py-10 text-sm text-red-500">
          {props.locale === 'ar' ? 'تعذر عرض المخطط' : 'Chart failed to render'}
        </div>
      )}
      {!failed && !ready && (
        <div className="flex items-center justify-center py-10 text-sm text-gray-400">
          {props.locale === 'ar' ? 'جارِ تحميل المخطط...' : 'Loading chart...'}
        </div>
      )}
    </div>
  );
}