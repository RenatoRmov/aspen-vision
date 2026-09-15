import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import { COMPANY_INFO } from "@/lib/company-info";

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1.5pt solid #111111",
  },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 8, color: "#666666", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "31.5%",
    border: "0.75pt solid #dddddd",
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
  },
  photo: {
    width: "100%",
    height: 90,
    objectFit: "cover",
    marginBottom: 5,
    backgroundColor: "#f2f0eb",
  },
  photoPlaceholder: {
    width: "100%",
    height: 90,
    marginBottom: 5,
    backgroundColor: "#f2f0eb",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  line: { fontSize: 7.5, color: "#444444", marginBottom: 1 },
  badge: {
    marginTop: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    right: 28,
    fontSize: 7,
    color: "#999999",
  },
});

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  model: string;
  barcode: string;
  categoryName: string;
  shape: string | null;
  color: string | null;
  material: string | null;
  stock: number;
  active: boolean;
  imageSrc: string | null;
};

const PER_PAGE = 9;

export function InventoryCatalogDocument({ products }: { products: CatalogProduct[] }) {
  const pages: CatalogProduct[][] = [];
  for (let i = 0; i < products.length; i += PER_PAGE) {
    pages.push(products.slice(i, i + PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <Document>
      {pages.map((pageProducts, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageIndex === 0 && (
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Catálogo de inventario</Text>
                <Text style={styles.subtitle}>{COMPANY_INFO.name}</Text>
              </View>
              <Text style={styles.subtitle}>
                {formatDate(new Date())} · {products.length} producto(s)
              </Text>
            </View>
          )}

          <View style={styles.grid}>
            {pageProducts.map((p) => (
              <View style={styles.card} key={p.id} wrap={false}>
                {p.imageSrc ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={p.imageSrc} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={{ fontSize: 7, color: "#999999" }}>Sin imagen</Text>
                  </View>
                )}
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.line}>
                  {p.brand} · {p.model}
                </Text>
                <Text style={styles.line}>{p.categoryName}</Text>
                {(p.shape || p.color || p.material) && (
                  <Text style={styles.line}>
                    {[p.shape, p.color, p.material].filter(Boolean).join(" · ")}
                  </Text>
                )}
                <Text style={styles.line}>Cód: {p.barcode}</Text>
                <Text
                  style={[
                    styles.badge,
                    { color: p.stock <= 0 ? "#b91c1c" : p.stock <= 3 ? "#92600a" : "#166534" },
                  ]}
                >
                  Stock: {p.stock}
                  {!p.active ? " · Inactivo" : ""}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
          <Text style={styles.footer} fixed>
            {COMPANY_INFO.name} · {COMPANY_INFO.email}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
