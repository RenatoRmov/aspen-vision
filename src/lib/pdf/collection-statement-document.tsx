import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCLP } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/company-info";
import type { CollectionCreditItem } from "@/lib/collections";

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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 84, height: 32, objectFit: "contain" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: "#444444", marginTop: 1 },
  docBox: { alignItems: "flex-end" },
  docType: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  docDate: { fontSize: 8, color: "#444444", marginTop: 2 },
  clientSection: { marginBottom: 14 },
  clientLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  clientName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  clientRut: { fontSize: 9, color: "#444444", marginTop: 1 },
  table: { marginTop: 4, borderTop: "1pt solid #111111" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #111111",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  // Only the last visual line of an account (the row itself, or its credit
  // note line when it has one) gets the separator — otherwise every account
  // would get a double line between its own row and its credit note note.
  tableRowBorder: { borderBottom: "0.5pt solid #cccccc" },
  colFolio: { width: "12%" },
  // Runs sideways in its own thin row instead of stacking under the folio —
  // reads as a note "born from" that document (small, italic, slightly
  // indented) without eating vertical space the way one line per model did.
  creditNoteRow: { flexDirection: "row", paddingBottom: 4 },
  creditNoteText: {
    marginLeft: 6,
    fontSize: 8,
    fontStyle: "italic",
    color: "#666666",
  },
  // Abono detail: one line per payment, smaller/lighter than the account
  // row above it, so it visibly reads as a secondary breakdown rather than
  // another account — matches the reference layout the client asked for.
  abonoRow: { flexDirection: "row", paddingBottom: 2 },
  abonoText: { marginLeft: 6, fontSize: 7, color: "#888888" },
  colDate: { width: "13%" },
  colAmount: { width: "17%", textAlign: "right" },
  colAmountLast: { width: "19%", textAlign: "right" },
  totalsBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: "1.5pt solid #111111",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  totalLabel: { fontSize: 9, color: "#444444" },
  totalValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalLabelFinal: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalValueFinal: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  noAccounts: { fontSize: 9, color: "#666666", marginTop: 8 },
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

export type StatementAccount = {
  folio: string;
  documentDate: Date;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalCreditNotes: number;
  creditNoteItems: CollectionCreditItem[];
  totalPaid: number;
  saldo: number;
  abonos: { date: Date; amount: number }[];
};

export type StatementClient = {
  clientRut: string;
  businessName: string;
  accounts: StatementAccount[];
};

// Fecha Docto is a pure calendar date, so it's formatted from UTC
// components — same reasoning as formatDateOnly in src/lib/format.ts,
// duplicated here since react-pdf renders outside the browser/Node
// Intl-with-timezone path this module otherwise shares with the app.
function formatDateUTC(date: Date) {
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function CollectionStatementDocument({
  clients,
  logoSrc,
  generatedAt,
}: {
  clients: StatementClient[];
  logoSrc?: string | null;
  generatedAt: Date;
}) {
  return (
    <Document>
      {clients.map((client) => {
        const totalPending = client.accounts.reduce((sum, a) => sum + a.saldo, 0);
        const totalAmountSum = client.accounts.reduce((sum, a) => sum + a.totalAmount, 0);
        const totalPaidSum = client.accounts.reduce((sum, a) => sum + a.totalPaid, 0);
        return (
          <Page key={client.clientRut} size="A4" style={styles.page}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                {logoSrc && (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={logoSrc} style={styles.logo} />
                )}
                <View>
                  <Text style={styles.companyName}>{COMPANY_INFO.name}</Text>
                  <Text style={styles.small}>RUT {COMPANY_INFO.rut}</Text>
                  <Text style={styles.small}>{COMPANY_INFO.address}</Text>
                  <Text style={styles.small}>{COMPANY_INFO.email}</Text>
                </View>
              </View>
              <View style={styles.docBox}>
                <Text style={styles.docType}>Estado de Cuenta</Text>
                <Text style={styles.docDate}>{formatDateUTC(generatedAt)}</Text>
              </View>
            </View>

            <View style={styles.clientSection}>
              <Text style={styles.clientLabel}>Cliente</Text>
              <Text style={styles.clientName}>{client.businessName}</Text>
              <Text style={styles.clientRut}>RUT: {client.clientRut}</Text>
            </View>

            {client.accounts.length === 0 ? (
              <Text style={styles.noAccounts}>No hay cuentas pendientes para este cliente.</Text>
            ) : (
              <>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.colFolio}>Folio</Text>
                    <Text style={styles.colDate}>Fecha Docto</Text>
                    <Text style={styles.colAmount}>Monto Neto</Text>
                    <Text style={styles.colAmount}>Monto IVA</Text>
                    <Text style={styles.colAmount}>Monto Total</Text>
                    <Text style={styles.colAmount}>Total Abonado</Text>
                    <Text style={styles.colAmountLast}>Deuda Total Pendiente</Text>
                  </View>
                  {client.accounts.map((a) => {
                    const hasDetail = a.totalCreditNotes > 0 || a.abonos.length > 0;
                    return (
                      <View key={a.folio}>
                        <View style={hasDetail ? styles.tableRow : { ...styles.tableRow, ...styles.tableRowBorder }}>
                          <Text style={styles.colFolio}>{a.folio}</Text>
                          <Text style={styles.colDate}>{formatDateUTC(a.documentDate)}</Text>
                          <Text style={styles.colAmount}>{formatCLP(a.netAmount)}</Text>
                          <Text style={styles.colAmount}>{formatCLP(a.taxAmount)}</Text>
                          <Text style={styles.colAmount}>{formatCLP(a.totalAmount)}</Text>
                          <Text style={styles.colAmount}>{formatCLP(a.totalPaid)}</Text>
                          <Text style={styles.colAmountLast}>{formatCLP(a.saldo)}</Text>
                        </View>
                        {a.totalCreditNotes > 0 && (
                          <View style={a.abonos.length > 0 ? styles.creditNoteRow : { ...styles.creditNoteRow, ...styles.tableRowBorder }}>
                            <Text style={styles.creditNoteText}>
                              N. Créd.:{" "}
                              {a.creditNoteItems.map((it) => `${it.modelo} x${it.cantidad}`).join(", ")}
                              {"  ("}-{formatCLP(a.totalCreditNotes)}
                              {")"}
                            </Text>
                          </View>
                        )}
                        {a.abonos.map((p, i) => (
                          <View
                            key={i}
                            style={i === a.abonos.length - 1 ? { ...styles.abonoRow, ...styles.tableRowBorder } : styles.abonoRow}
                          >
                            <Text style={styles.abonoText}>
                              Abono {i + 1} — {formatDateUTC(p.date)} — {formatCLP(p.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Monto total</Text>
                    <Text style={styles.totalValue}>{formatCLP(totalAmountSum)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Monto total abonado</Text>
                    <Text style={styles.totalValue}>{formatCLP(totalPaidSum)}</Text>
                  </View>
                  <View style={styles.totalRowFinal}>
                    <Text style={styles.totalLabelFinal}>Total deuda pendiente</Text>
                    <Text style={styles.totalValueFinal}>{formatCLP(totalPending)}</Text>
                  </View>
                </View>

                <View style={styles.bankBox}>
                  <Text style={styles.bankTitle}>Datos para transferencia</Text>
                  <Text style={styles.bankLine}>
                    {COMPANY_INFO.bank.accountHolder} — RUT {COMPANY_INFO.bank.accountHolderRut}
                  </Text>
                  <Text style={styles.bankLine}>
                    {COMPANY_INFO.bank.bankName} · {COMPANY_INFO.bank.accountType} ·{" "}
                    {COMPANY_INFO.bank.accountNumber}
                  </Text>
                  <Text style={styles.bankLine}>{COMPANY_INFO.bank.email}</Text>
                </View>
              </>
            )}

            <Text style={styles.footer} fixed>
              {COMPANY_INFO.name} · {COMPANY_INFO.email} · {COMPANY_INFO.phone}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}
