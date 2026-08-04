'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

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
  showLegend?: boolean;
  showToolbar?: boolean;
  showDataLabels?: boolean;
  fillOpacity?: number;
  fontSize?: string;
  dir?: 'ltr' | 'rtl';
  locale?: 'en' | 'ar';
  className?: string;
}

const DEFAULT_COLORS = ['#009B77', '#00205B', '#FFC72C', '#0DCAF0', '#FD7E14', '#198754'];

const FONT_FAMILY: Record<string, string> = {
  en: 'Inter, system-ui, sans-serif',
  ar: 'Cairo, system-ui, sans-serif',
};

export function Chart({
  type,
  series,
  categories,
  labels,
  height = 300,
  width,
  colors = DEFAULT_COLORS,
  donutSize = '60%',
  showLegend = true,
  showToolbar = false,
  showDataLabels = false,
  fillOpacity = 0.85,
  fontSize = '13px',
  dir = 'ltr',
  locale = 'en',
  className,
}: ChartEngineProps) {
  const commonOptions: ApexCharts.ApexOptions = {
    chart: {
      foreColor: '#6B7280',
      fontFamily: FONT_FAMILY[locale] || FONT_FAMILY.en,
      toolbar: { show: showToolbar },
      animations: { enabled: true, speed: 300 },
      parentHeightOffset: 0,
    },
    colors,
    stroke: { curve: 'smooth', width: 2 },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 3,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    dataLabels: { enabled: showDataLabels },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: fillOpacity, opacityTo: 0.35 },
      opacity: fillOpacity,
    },
    legend: {
      show: showLegend,
      position: 'bottom',
      horizontalAlign: dir === 'rtl' ? 'left' : 'center',
      fontSize,
      labels: { colors: '#6B7280' },
      markers: { size: 4 },
    },
    tooltip: { theme: 'light' },
    noData: {
      text: locale === 'ar' ? 'لا توجد بيانات' : 'No data available',
      style: { fontSize },
    },
  };

  let options: ApexCharts.ApexOptions;
  const isPieLike = type === 'pie' || type === 'donut' || type === 'radialBar';

  if (isPieLike) {
    options = {
      ...commonOptions,
      labels: labels,
      plotOptions: {
        pie: {
          donut: { size: donutSize, labels: { show: true, name: { fontSize }, value: { fontSize } } },
          expandOnClick: true,
        },
      },
      responsive: [{ breakpoint: 480, options: { chart: { width: 300 } } }],
    };
  } else {
    options = {
      ...commonOptions,
      xaxis: {
        categories: categories,
        labels: { style: { fontSize } },
      },
      yaxis: { labels: { style: { fontSize } } },
      plotOptions:
        type === 'bar'
          ? { bar: { borderRadius: 4, columnWidth: '55%', distributed: false } }
          : undefined,
    };
  }

  return (
    <div className={className} dir={dir}>
      <ApexChart
        type={type}
        series={series as ApexCharts.ApexOptions['series']}
        options={options}
        height={height}
        width={width}
      />
    </div>
  );
}
