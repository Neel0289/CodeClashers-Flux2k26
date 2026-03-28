import { useMemo } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

import Card from '../shared/Card'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        padding: 14,
        font: {
          size: 12,
          weight: '600',
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(11, 30, 20, 0.92)',
      titleColor: '#e6f4ea',
      bodyColor: '#e6f4ea',
      borderColor: 'rgba(34, 197, 94, 0.45)',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#4b5563',
        maxRotation: 35,
        minRotation: 20,
      },
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.22)',
      },
      ticks: {
        color: '#4b5563',
      },
    },
  },
}

const compactChartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      ...baseChartOptions.scales.x,
      ticks: {
        ...baseChartOptions.scales.x.ticks,
        maxRotation: 0,
        minRotation: 0,
      },
    },
    y: baseChartOptions.scales.y,
  },
}

const pieChartOptions = {
  ...baseChartOptions,
  scales: undefined,
}

export default function FarmerInsightsCharts({ orders = [] }) {
  const soldOrders = useMemo(() => {
    const saleStatuses = new Set(['confirmed', 'logistics_pending', 'shipped', 'delivered', 'completed'])
    return orders
      .filter((order) => saleStatuses.has(order.status))
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
  }, [orders])

  const overallRevenueLineData = useMemo(() => {
    let runningTotal = 0
    const recent = soldOrders.slice(-12)

    return {
      labels: recent.map((order) => `#${order.id}`),
      datasets: [
        {
          label: 'Overall Revenue (Rs)',
          data: recent.map((order) => {
            runningTotal += Number(order.agreed_price || 0)
            return Number(runningTotal.toFixed(2))
          }),
          borderColor: '#15803d',
          backgroundColor: 'rgba(21, 128, 61, 0.16)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        },
      ],
    }
  }, [soldOrders])

  const salesByProductBarData = useMemo(() => {
    const totalsByProduct = new Map()
    for (const order of soldOrders) {
      const productName = order.product_name || `Product #${order.product}`
      const prev = totalsByProduct.get(productName) || 0
      totalsByProduct.set(productName, prev + Number(order.agreed_price || 0))
    }

    const rows = Array.from(totalsByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    return {
      labels: rows.map(([name]) => name),
      datasets: [
        {
          label: 'Sales Amount (Rs)',
          data: rows.map(([, value]) => Number(value.toFixed(2))),
          backgroundColor: '#2f855a',
          borderRadius: 8,
        },
      ],
    }
  }, [soldOrders])

  const tradedKgPieData = useMemo(() => {
    const kgByProduct = new Map()
    for (const order of soldOrders) {
      const productName = order.product_name || `Product #${order.product}`
      const prev = kgByProduct.get(productName) || 0
      kgByProduct.set(productName, prev + Number(order.quantity || 0))
    }

    const rows = Array.from(kgByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    const palette = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#e11d48', '#84cc16']

    return {
      labels: rows.map(([name]) => name),
      datasets: [
        {
          label: 'Traded Quantity (kg)',
          data: rows.map(([, kg]) => Number(kg.toFixed(2))),
          backgroundColor: rows.map((_, idx) => palette[idx % palette.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }
  }, [soldOrders])

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-6">
      <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 lg:col-span-6">
        <p className="mb-3 text-xl font-semibold text-emerald-800">Overall Revenue Trend</p>
        <div className="h-80">
          {overallRevenueLineData.labels.length > 0 ? <Line options={baseChartOptions} data={overallRevenueLineData} /> : <p className="text-sm text-text-muted">No sold orders yet for revenue trend.</p>}
        </div>
      </Card>

      <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-5 lg:col-span-3">
        <p className="mb-3 text-xl font-semibold text-emerald-800">Product Sales Amount</p>
        <div className="h-80">
          {salesByProductBarData.labels.length > 0 ? <Bar options={compactChartOptions} data={salesByProductBarData} /> : <p className="text-sm text-text-muted">No product sales data yet.</p>}
        </div>
      </Card>

      <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-5 lg:col-span-3">
        <p className="mb-3 text-xl font-semibold text-emerald-800">Item-wise Traded Quantity (kg)</p>
        <div className="h-80">
          {tradedKgPieData.labels.length > 0 ? (
            <Pie options={pieChartOptions} data={tradedKgPieData} />
          ) : (
            <p className="text-sm text-text-muted">No traded quantity data yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
