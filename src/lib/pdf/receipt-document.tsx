import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCLP, formatDateTime } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/company-info";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1.5pt solid #111111",
  },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: "#444444", marginTop: 1 },
  docBox: { alignItems: "flex-end" },
  docType: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  docCode: { fontSize: 10, marginTop: 2 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  infoGrid: { flexDirection: "row", gap: 24 },
  infoCol: { flexGrow: 1 },
  infoLine: { fontSize: 9, marginBottom: 1 },
  table: { marginTop: 4, borderTop: "1pt solid #111111" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #111111",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #cccccc",
    paddingVertical: 4,
  },
  colNum: { width: "6%" },
  colDesc: { width: "40%" },
  colDescWide: { width: "80%" },
  colQty: { width: "10%", textAlign: "right" },
  colQtyWide: { width: "14%", textAlign: "right" },
  colPrice: { width: "16%", textAlign: "right" },
  colTax: { width: "12%", textAlign: "right" },
  colAmount: { width: "16%", textAlign: "right" },
  summaryBox: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "45%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #111111",
    marginTop: 3,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  bankBox: {
    marginTop: 20,
    padding: 8,
    border: "0.75pt solid #999999",
  },
  bankTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bankLine: { fontSize: 8.5, marginBottom: 1 },
  noteBox: { marginTop: 16, fontSize: 8, color: "#444444" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
    borderTop: "0.5pt solid #dddddd",
    paddingTop: 6,
  },
});

type SaleLine = {
  position: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
};

type SimpleLine = {
  position: number;
  description: string;
  quantity: number;
};

export function VentaReceiptDocument({
  code,
  date,
  sellerName,
  customerName,
  customerRut,
  customerBusinessName,
  paymentMethod,
  notes,
  lines,
  subtotal,
  taxAmount,
  total,
}: {
  code: string;
  date: Date;
  sellerName: string;
  customerName?: string | null;
  customerRut?: string | null;
  customerBusinessName?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  lines: SaleLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header docType="Comprobante de venta" code={code} date={date} />

        <View style={styles.section}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.infoLine}>{customerName || "Cliente sin registrar"}</Text>
              {customerRut && <Text style={styles.infoLine}>RUT: {customerRut}</Text>}
              {customerBusinessName && (
                <Text style={styles.infoLine}>Razón social: {customerBusinessName}</Text>
              )}
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.sectionTitle}>Venta</Text>
              <Text style={styles.infoLine}>Vendedor: {sellerName}</Text>
              {paymentMethod && <Text style={styles.infoLine}>Pago: {paymentMethod}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Descripción</Text>
            <Text style={styles.colQty}>Cant.</Text>
            <Text style={styles.colPrice}>P. unitario</Text>
            <Text style={styles.colTax}>IVA</Text>
            <Text style={styles.colAmount}>Importe</Text>
          </View>
          {lines.map((l) => (
            <View style={styles.tableRow} key={l.position}>
              <Text style={styles.colNum}>{l.position}</Text>
              <View style={styles.colDesc}>
                <Text>{l.description}</Text>
                {l.notes && <Text style={styles.small}>{l.notes}</Text>}
              </View>
              <Text style={styles.colQty}>{l.quantity}</Text>
              <Text style={styles.colPrice}>{formatCLP(l.unitPrice)}</Text>
              <Text style={styles.colTax}>{formatCLP(l.taxAmount)}</Text>
              <Text style={styles.colAmount}>{formatCLP(l.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>{formatCLP(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>IVA (19%)</Text>
            <Text>{formatCLP(taxAmount)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text>TOTAL</Text>
            <Text>{formatCLP(total)}</Text>
          </View>
        </View>

        <View style={styles.bankBox}>
          <Text style={styles.bankTitle}>Datos para transferencia</Text>
          <Text style={styles.bankLine}>
            {COMPANY_INFO.name} — RUT {COMPANY_INFO.bank.accountHolderRut}
          </Text>
          <Text style={styles.bankLine}>
            {COMPANY_INFO.bank.bankName} · {COMPANY_INFO.bank.accountType} ·{" "}
            {COMPANY_INFO.bank.accountNumber}
          </Text>
          <Text style={styles.bankLine}>{COMPANY_INFO.bank.email}</Text>
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text>Notas: {notes}</Text>
          </View>
        )}

        <Footer />
      </Page>
    </Document>
  );
}

export function MovementReceiptDocument({
  docType,
  code,
  date,
  recipientLabel,
  recipientName,
  recipientContact,
  responsibleName,
  reasonLabel,
  reason,
  notes,
  lines,
}: {
  docType: string;
  code: string;
  date: Date;
  recipientLabel: string;
  recipientName: string;
  recipientContact?: string | null;
  responsibleName: string;
  reasonLabel?: string;
  reason?: string | null;
  notes?: string | null;
  lines: SimpleLine[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header docType={docType} code={code} date={date} />

        <View style={styles.section}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.sectionTitle}>{recipientLabel}</Text>
              <Text style={styles.infoLine}>{recipientName}</Text>
              {recipientContact && <Text style={styles.infoLine}>{recipientContact}</Text>}
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.sectionTitle}>Responsable</Text>
              <Text style={styles.infoLine}>{responsibleName}</Text>
            </View>
          </View>
          {reason && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>{reasonLabel ?? "Motivo"}</Text>
              <Text style={styles.infoLine}>{reason}</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDescWide}>Descripción</Text>
            <Text style={styles.colQtyWide}>Cantidad</Text>
          </View>
          {lines.map((l) => (
            <View style={styles.tableRow} key={l.position}>
              <Text style={styles.colNum}>{l.position}</Text>
              <Text style={styles.colDescWide}>{l.description}</Text>
              <Text style={styles.colQtyWide}>{l.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Text>Este documento no tiene valor comercial.</Text>
          {notes && <Text style={{ marginTop: 4 }}>Notas: {notes}</Text>}
        </View>

        <Footer />
      </Page>
    </Document>
  );
}

function Header({ docType, code, date }: { docType: string; code: string; date: Date }) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.companyName}>{COMPANY_INFO.name}</Text>
        <Text style={styles.small}>RUT {COMPANY_INFO.rut}</Text>
        <Text style={styles.small}>{COMPANY_INFO.address}</Text>
        <Text style={styles.small}>{COMPANY_INFO.email}</Text>
      </View>
      <View style={styles.docBox}>
        <Text style={styles.docType}>{docType}</Text>
        <Text style={styles.docCode}>{code}</Text>
        <Text style={styles.small}>{formatDateTime(date)}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      {COMPANY_INFO.name} · {COMPANY_INFO.email} · {COMPANY_INFO.phone}
    </Text>
  );
}
