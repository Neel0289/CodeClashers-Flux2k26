function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export function openInvoiceWindow({
  invoicePrefix = 'INV',
  orderId,
  invoiceDate = new Date(),
  title = 'KhetBazaar Invoice',
  subtitle = 'One-click order invoice',
  sellerLabel = 'Seller',
  sellerName,
  sellerAddress,
  buyerLabel = 'Buyer',
  buyerName,
  buyerAddress,
  itemLabel = 'Item',
  itemName,
  quantity = 0,
  rate,
  total,
  extraRows = [],
}) {
  const popup = window.open('', '_blank', 'width=900,height=760')
  if (!popup) {
    return false
  }

  const qty = toNumber(quantity)
  const totalValue = toNumber(total)
  const unitRate = rate !== undefined && rate !== null ? toNumber(rate) : (qty > 0 ? totalValue / qty : totalValue)
  const normalizedDate = invoiceDate instanceof Date ? invoiceDate : new Date(invoiceDate)
  const invoiceNo = `${invoicePrefix}-${orderId || 'NA'}-${normalizedDate.toISOString().slice(0, 10).replaceAll('-', '')}`

  const safeSellerName = escapeHtml(sellerName || '-')
  const safeSellerAddress = escapeHtml(sellerAddress || 'Address not available')
  const safeBuyerName = escapeHtml(buyerName || '-')
  const safeBuyerAddress = escapeHtml(buyerAddress || 'Address not available')
  const safeItemName = escapeHtml(itemName || '-')

  const extraRowsHtml = extraRows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="right">${escapeHtml(row.value)}</td></tr>`)
    .join('')

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)} ${invoiceNo}</title>
        <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
          .brand { font-size:22px; font-weight:700; color:#047857; }
          .meta { font-size:12px; text-align:right; color:#4b5563; }
          .panel { border:1px solid #d1d5db; border-radius:10px; padding:12px; margin-bottom:12px; }
          .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
          table { width:100%; border-collapse:collapse; margin-top:10px; }
          th, td { border:1px solid #d1d5db; padding:8px; font-size:13px; }
          th { background:#f3f4f6; text-align:left; }
          .right { text-align:right; }
          .total { margin-top:10px; text-align:right; font-size:14px; font-weight:700; }
          .print-row { margin-top:16px; display:flex; justify-content:flex-end; gap:8px; }
          .print-btn { background:#047857; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; }
          .download-btn { background:#1d4ed8; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; }
          @media print { .print-row { display:none; } body { margin: 8px; } }
        </style>
      </head>
      <body>
        <div id="invoice-root">
          <div class="header">
            <div>
              <div class="brand">${escapeHtml(title)}</div>
              <div style="font-size:12px; color:#4b5563; margin-top:3px;">${escapeHtml(subtitle)}</div>
            </div>
            <div class="meta">
              <div><strong>Invoice No:</strong> ${invoiceNo}</div>
              <div><strong>Date:</strong> ${normalizedDate.toLocaleDateString('en-IN')}</div>
              <div><strong>Order ID:</strong> #${escapeHtml(orderId)}</div>
            </div>
          </div>

          <div class="grid">
            <div class="panel">
              <div style="font-weight:700; margin-bottom:6px;">${escapeHtml(sellerLabel)}</div>
              <div>${safeSellerName}</div>
              <div style="font-size:12px; color:#4b5563;">${safeSellerAddress}</div>
            </div>
            <div class="panel">
              <div style="font-weight:700; margin-bottom:6px;">${escapeHtml(buyerLabel)}</div>
              <div>${safeBuyerName}</div>
              <div style="font-size:12px; color:#4b5563;">${safeBuyerAddress}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(itemLabel)}</th>
                <th class="right">Quantity (kg)</th>
                <th class="right">Rate (Rs/kg)</th>
                <th class="right">Total (Rs)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${safeItemName}</td>
                <td class="right">${qty.toFixed(2)}</td>
                <td class="right">${unitRate.toFixed(2)}</td>
                <td class="right">${totalValue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${extraRowsHtml ? `<table style="margin-top:8px;"><tbody>${extraRowsHtml}</tbody></table>` : ''}

          <div class="total">Grand Total: Rs ${totalValue.toFixed(2)}</div>
        </div>

        <div class="print-row">
          <button class="download-btn" onclick="downloadPdf()">Download PDF</button>
          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <script>
          async function downloadPdf() {
            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
              alert('PDF library failed to load. Please try again.')
              return
            }

            const invoiceNode = document.getElementById('invoice-root')
            if (!invoiceNode) {
              alert('Invoice content not found. Please try again.')
              return
            }

            const canvas = await window.html2canvas(invoiceNode, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
            })

            const { jsPDF } = window.jspdf
            const imgData = canvas.toDataURL('image/png')
            const doc = new jsPDF('p', 'mm', 'a4')
            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const imgWidth = pageWidth
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            let renderedHeight = imgHeight
            let position = 0

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            renderedHeight -= pageHeight

            while (renderedHeight > 0) {
              position = renderedHeight - imgHeight
              doc.addPage()
              doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
              renderedHeight -= pageHeight
            }

            doc.save(${JSON.stringify(invoiceNo)} + '.pdf')
          }
        </script>
      </body>
    </html>
  `)

  popup.document.close()
  return true
}
