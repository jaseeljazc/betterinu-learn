import { Document, Page, Text, View, StyleSheet, Image, Link, Svg, Path, Circle, Ellipse } from "@react-pdf/renderer"

function LogoSvg() {
  return (
    <Svg width="100" height="28" viewBox="0 0 148 41">
      <Path d="M9.20992 17.1797H0V39.7348H6.57852V23.1944C9.13474 22.8936 9.64849 23.9462 9.58584 24.5101C9.58584 25.2619 8.33279 25.5752 7.70626 25.6378V31.6525C10.4129 31.3518 10.8389 32.4044 10.7136 32.9682C10.7136 33.8704 8.7087 33.9707 7.70626 33.908V39.7348C14.9238 40.1859 16.6029 35.7876 16.5403 33.5321C16.6906 30.3744 14.3474 28.2066 13.157 27.5174C15.2622 25.8634 15.5378 23.445 15.4125 22.4425C15.4125 18.533 11.2775 17.305 9.20992 17.1797Z" fill="#20703D"/>
      <Path d="M35.7878 32.5261C36.0885 25.3085 30.525 23.1281 27.7056 22.9402C20.488 22.7898 18.6836 29.0175 18.6836 32.1502C18.6836 36.3604 22.4427 39.042 24.3223 39.8565C27.6304 41.2098 31.3394 39.4179 32.7804 38.3528L29.3972 34.0298C28.9461 34.932 27.8309 35.0322 27.3296 34.9695C25.6756 34.9695 25.1369 32.714 25.0742 31.5863C24.7735 28.5789 26.7032 27.8271 27.7056 27.8271C29.2092 27.8271 29.7105 29.0802 29.7732 29.7067H26.5778C25.9764 30.4585 26.3272 31.8996 26.5778 32.5261H35.7878Z" fill="#20703D"/>
      <Path d="M44.1401 17.1719H37.9375V31.8327C37.9375 38.5992 44.0774 40.2908 47.1474 40.2908V33.7123C46.3956 33.7123 45.5811 33.4617 45.2678 33.3363C44.3656 33.0356 44.1401 31.2061 44.1401 30.329H46.9595V23.7504H44.1401V17.1719Z" fill="#20703D"/>
      <Path d="M56.7573 17.1719H50.5547V31.8327C50.5547 38.5992 56.6946 40.2908 59.7646 40.2908V33.7123C59.0128 33.7123 58.1983 33.4617 57.885 33.3363C56.9828 33.0356 56.7573 31.2061 56.7573 30.329H59.5767V23.7504H56.7573V17.1719Z" fill="#20703D"/>
      <Path d="M81.4235 30.5338V39.7438H87.4382V31.6616C87.4382 28.5039 89.3178 28.9675 90.2575 29.594V23.0155C83.04 21.8125 81.3609 27.5265 81.4235 30.5338Z" fill="#20703D"/>
      <Path d="M99.3862 23.7578H93.1836V39.5464H99.3862V23.7578Z" fill="#20703D"/>
      <Path d="M99.1982 19.437C99.0479 17.1815 97.1307 16.4923 96.1909 16.4297C93.7851 16.5801 93.1836 18.4972 93.1836 19.437C93.1836 21.8429 95.1885 22.4444 96.1909 22.4444C98.5968 22.4444 99.1982 20.4395 99.1982 19.437Z" fill="#20703D"/>
      <Path d="M102.117 29.4513V39.5102L109.537 39.5102V29.7982C109.866 28.5744 111.736 28.6326 112.039 29.7982V39.5102L119.432 39.5102V29.4513C118.679 22.9304 113.472 21.5314 110.963 21.6471C104.037 21.5083 102.18 26.7921 102.117 29.4513Z" fill="#20703D"/>
      <Path d="M129.593 21.5312H122.777V33.01C122.921 39.0364 128.457 40.4234 131.207 40.3636C137.09 40.5071 139.039 35.521 139.278 33.01V21.5312H132.104V32.2926C132.247 33.7274 131.327 34.0861 130.848 34.0861C129.844 34.0861 129.593 32.8904 129.593 32.2926V21.5312Z" fill="#20703D"/>
      <Path d="M129.044 3.8764C125.104 4.55183 122.947 7.11285 122.36 8.30892V5.21319C122.29 4.8614 122.008 4.8614 121.938 4.8614C121.657 4.8614 121.586 5.09593 121.586 5.21319V8.66071H121.164C120.939 8.66071 120.789 8.94214 120.742 9.08286C120.719 10.7949 120.686 14.3315 120.742 14.7818C120.798 15.2321 121.094 15.3916 121.235 15.415H122.008C122.234 16.2593 123.556 17.5961 124.19 18.159C125.372 19.0596 129.842 19.2378 131.929 19.2143C134.687 19.2143 136.877 18.5108 137.628 18.159C138.979 17.371 139.692 16.0014 139.879 15.415C140.184 15.4385 140.822 15.4573 140.935 15.3447C141.047 15.2321 141.075 14.9694 141.075 14.8522V9.15322L140.935 8.73107H140.231V5.28355C140.231 4.88955 139.997 4.79105 139.879 4.79105C139.598 4.79105 139.527 5.11938 139.527 5.28355V8.30892C138.458 5.71977 134.626 4.27509 132.844 3.8764L132.492 3.59497H131.225V1.69531H130.662V3.59497H129.396L129.044 3.8764Z" fill="#20703D"/>
      <Path d="M129.186 6.82555C125.246 6.76927 123.464 8.86592 123.065 9.92129C122.666 10.9767 122.713 11.8913 122.713 11.8913C122.601 13.2984 123.042 14.3538 123.276 14.7056C124.177 16.7319 127.451 17.2385 128.975 17.2385H133.619C136.433 17.1822 138.028 15.7141 138.473 14.987C139.374 13.9176 139.177 11.4926 138.966 10.4138C138.234 7.82462 135.472 6.94281 134.182 6.82555C132.892 6.70829 129.186 6.82555 129.186 6.82555Z" stroke="white" strokeWidth="0.227957"/>
      <Path d="M129.371 7.23585C125.629 7.18363 123.937 9.12889 123.558 10.108C123.18 11.0872 123.224 11.9358 123.224 11.9358C123.117 13.2413 123.536 14.2205 123.759 14.5469C124.614 16.4269 127.723 16.8969 129.17 16.8969H133.58C136.252 16.8446 137.766 15.4825 138.189 14.808C139.045 13.8158 138.858 11.5659 138.657 10.565C137.962 8.16278 135.339 7.34464 134.114 7.23585C132.889 7.12706 129.371 7.23585 129.371 7.23585Z" fill="white"/>
      <Path d="M119.547 11.7438C119.547 10.5055 120.204 9.58613 120.532 9.28125L120.462 14.5581C119.73 13.8264 119.547 12.377 119.547 11.7438Z" fill="#20703D"/>
      <Path d="M142.203 11.7438C142.203 10.5055 141.546 9.58613 141.218 9.28125L141.288 14.5581C142.02 13.8264 142.203 12.377 142.203 11.7438Z" fill="#20703D"/>
      <Circle cx="130.942" cy="0.985007" r="0.985007" fill="#20703D"/>
      <Circle cx="128.406" cy="11.8318" r="1.37083" fill="#20703D"/>
      <Circle cx="133.64" cy="11.8318" r="1.37083" fill="#20703D"/>
      <Ellipse cx="1.78793" cy="4.83092" rx="1.78793" ry="4.83092" transform="matrix(0.67132 -0.741167 -0.741167 -0.67132 120.668 23.3203)" fill="#20703D"/>
      <Ellipse cx="1.78793" cy="4.83092" rx="1.78793" ry="4.83092" transform="matrix(-0.907882 0.419226 0.419226 0.907882 142.082 20.6797)" fill="#20703D"/>
      <Path d="M146.257 33.9792C146.518 34.1554 146.88 34.0876 146.986 33.7914C147.055 33.5962 147.098 33.3916 147.113 33.183C147.14 32.784 147.062 32.3847 146.885 32.0258C146.709 31.6668 146.441 31.3608 146.108 31.1387C145.775 30.9167 145.39 30.7865 144.991 30.7614C144.592 30.7362 144.193 30.817 143.835 30.9955C143.477 31.174 143.173 31.4439 142.952 31.7779C142.732 32.1119 142.604 32.4981 142.582 32.8975C142.57 33.1062 142.587 33.3146 142.631 33.517C142.699 33.8241 143.05 33.9368 143.331 33.7948C143.611 33.6528 143.707 33.3016 143.718 32.9872C143.718 32.979 143.718 32.9707 143.719 32.9625C143.73 32.7635 143.794 32.5711 143.904 32.4047C144.013 32.2383 144.165 32.1039 144.343 32.0149C144.522 31.926 144.72 31.8858 144.919 31.8983C145.118 31.9108 145.31 31.9757 145.476 32.0863C145.642 32.1969 145.775 32.3494 145.863 32.5282C145.951 32.707 145.99 32.9059 145.976 33.1047C145.976 33.113 145.975 33.1212 145.974 33.1294C145.946 33.4427 145.996 33.8031 146.257 33.9792Z" fill="#20703D"/>
      <Path d="M112.28 11.6838C111.997 11.5472 111.648 11.6667 111.586 11.9751C111.546 12.1783 111.533 12.387 111.549 12.5954C111.579 12.9942 111.714 13.3779 111.941 13.7076C112.167 14.0373 112.477 14.3014 112.838 14.473C113.199 14.6446 113.6 14.7177 113.998 14.6848C114.397 14.652 114.78 14.5145 115.108 14.2861C115.437 14.0577 115.699 13.7466 115.868 13.3843C116.038 13.022 116.109 12.6214 116.073 12.2229C116.055 12.0147 116.008 11.8109 115.935 11.6171C115.823 11.323 115.46 11.2622 115.203 11.4433C114.945 11.6244 114.902 11.9857 114.936 12.2984C114.937 12.3066 114.938 12.3148 114.939 12.323C114.956 12.5215 114.921 12.7211 114.836 12.9016C114.752 13.0821 114.621 13.2371 114.458 13.3509C114.294 13.4646 114.103 13.5332 113.905 13.5495C113.706 13.5659 113.507 13.5294 113.327 13.444C113.147 13.3585 112.993 13.2269 112.88 13.0627C112.767 12.8984 112.7 12.7073 112.684 12.5086C112.684 12.5003 112.683 12.4921 112.683 12.4839C112.666 12.1697 112.564 11.8205 112.28 11.6838Z" fill="#20703D"/>
      <Path d="M79.1349 32.4765C79.1349 24.8078 73.4962 22.8906 70.6768 22.8906C65.414 22.8906 62.8452 27.151 62.2187 29.2812C61.1661 32.2886 62.532 35.2959 63.3464 36.4237C65.1508 39.2806 68.3587 40.2455 69.737 40.3708C71.9925 40.6715 74.9372 39.1178 76.1276 38.3033L72.5564 33.9802C71.8045 34.732 70.9901 34.92 70.6768 34.92C69.0228 34.92 68.3587 32.7898 68.2334 31.7247C67.7823 28.567 69.6744 27.7776 70.6768 27.7776C72.1804 27.7776 72.807 29.0306 72.9323 29.6571H69.737C69.1356 30.409 69.4864 31.85 69.737 32.4765H79.1349Z" fill="#20703D"/>
    </Svg>
  )
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 100,
    height: 35,
  },
  headerRight: {
    alignItems: "flex-end",
    flex: 1,
    marginLeft: 15,
  },
  schoolName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textAlign: "right",
  },
  schoolAddress: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#444444",
    textAlign: "right",
    marginTop: 2,
    lineHeight: 1.3,
  },
  schoolAddressLink: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#053a85",
    textAlign: "right",
    marginTop: 2,
    lineHeight: 1.3,
    textDecoration: "underline",
  },

  // ── Title ──
  titleRow: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#067635",
    textAlign: "center",
    letterSpacing: 1.2,
    textDecoration: "underline",
  },

  // ── Main Table ──
  mainTable: {
    borderWidth: 0.5,
    borderColor: "#555555",
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowLast: {
    flexDirection: "row",
  },
  leftCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#555555",
    padding: 0,
  },
  rightCell: {
    flex: 1,
    padding: 0,
  },
  fieldRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  fieldRowLast: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  fieldLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    width: 85,
  },
  fieldColon: {
    fontSize: 9,
    color: "#1a1a1a",
    marginRight: 4,
  },
  fieldValue: {
    fontSize: 9,
    color: "#1a1a1a",
    flex: 1,
  },
  fieldValueBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    flex: 1,
  },

  // ── Signatures ──
  signaturesSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  signatureBlock: {
    width: 200,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 9,
    color: "#1a1a1a",
    marginBottom: 15,
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: "#555555",
    paddingTop: 3,
  },
  signatureLineText: {
    fontSize: 8,
    color: "#555555",
    textAlign: "center",
  },
  authorisedBlock: {
    alignItems: "flex-end",
    width: 200,
  },
  authorisedLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 35,
  },
  authorisedLine: {
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: "#555555",
    paddingTop: 3,
  },
  authorisedLineText: {
    fontSize: 8,
    color: "#555555",
    textAlign: "center",
  },

  // ── Terms ──
  termsSection: {
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 8,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#067635",
    textDecoration: "underline",
    marginBottom: 6,
  },
  termItem: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginBottom: 3,
    lineHeight: 1.3,
  },
})

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })
  } catch {
    return "—"
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₹0.00"
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  )
}

function fmtMode(mode: string) {
  const MAP: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    other: "Other",
  }
  return MAP[mode] ?? mode
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ReceiptPDFProps = {
  data: any
  totalPaid: number
  nextInstallment: {
    installmentNumber: number
    totalAmount: number
    dueDate: string
  } | null
  env: {
    name: string
    address: string
    phone: string
    email: string
  }
  logoBase64?: string // optional base64 logo; if omitted the space is left blank
  logoUrl?: string // URL of the logo image
}

// ── Field Row Helpers ─────────────────────────────────────────────────────────

function Field({
  label,
  value,
  bold = false,
  last = false,
}: {
  label: string
  value: string
  bold?: boolean
  last?: boolean
}) {
  return (
    <View style={last ? styles.fieldRowLast : styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldColon}>:</Text>
      <Text style={bold ? styles.fieldValueBold : styles.fieldValue}>{value}</Text>
    </View>
  )
}

// ── Document ──────────────────────────────────────────────────────────────────

export function ReceiptPDF({
  data,
  totalPaid,
  nextInstallment,
  env,
  logoBase64,
  logoUrl,
}: ReceiptPDFProps) {
  const isOneTime = data.paymentType === "one_time"
  const courseFee = isOneTime ? (data.oneTimePrice ?? 0) : (data.installmentTotalPrice ?? 0)
  const balance = courseFee - totalPaid

  // Build address string for student
  const studentAddressLines = (data.studentAddress || "").split("\n")

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Logo area */}
          <View style={{ marginTop: -6 }}>
            <View style={styles.logoPlaceholder}>
              <LogoSvg />
            </View>
          </View>

          {/* School info top-right */}
          <View style={styles.headerRight}>
            {/* Double Overlapping Border Line (Green 100% width, Black 25% width on the right) */}
            <View style={{ width: "100%", height: 3, backgroundColor: "#067635", marginBottom: 6, position: "relative" }}>
              <View style={{ position: "absolute", right: 0, top: -0.5, height: 4, width: "25%", backgroundColor: "#000000" }} />
            </View>

            <Text style={styles.schoolName}>{env.name.toUpperCase()}</Text>

            {env.address.split("|").map((part, i) => (
              <Text key={i} style={styles.schoolAddress}>
                {part.trim()}
              </Text>
            ))}
            <Text style={styles.schoolAddress}>{env.phone}</Text>
            <Link src={`mailto:${env.email}`} style={styles.schoolAddressLink}>
              {env.email}
            </Link>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>FEE RECEIPT</Text>
        </View>

        {/* ── Main Info Table ── */}
        <View style={styles.mainTable}>

          {/* Row 1: Receipt No | Course No */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field label="Receipt No" value={data.receiptNumber ?? "—"} last />
            </View>
            <View style={styles.rightCell}>
              <Field label="Course No" value={data.courseId ?? "—"} last />
            </View>
          </View>

          {/* Row 2: Received From | Fees */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field label="Received From" value={data.studentName ?? "—"} last />
            </View>
            <View style={styles.rightCell}>
              <Field label="Fees" value={formatCurrency(courseFee)} bold last />
            </View>
          </View>

          {/* Row 3: Address (multiline) | (blank right or course name) */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <View style={styles.fieldRowLast}>
                <Text style={styles.fieldLabel}>Address</Text>
                <Text style={styles.fieldColon}>:</Text>
                <View style={{ flex: 1 }}>
                  {studentAddressLines.map((line: string, i: number) => (
                    <Text key={i} style={styles.fieldValue}>{line}</Text>
                  ))}
                  {data.studentPhone ? (
                    <Text style={styles.fieldValue}>{data.studentPhone}</Text>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={styles.rightCell}>
              {/* Course name can go here */}
              <Field label="Course Name" value={data.courseName ?? "—"} last />
            </View>
          </View>

          {/* Row 4: Installment Date | Total Paid */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field label="Installment Date" value={formatDate(data.dueDate)} last />
            </View>
            <View style={styles.rightCell}>
              <Field label="Total Paid" value={formatCurrency(totalPaid)} bold last />
            </View>
          </View>

          {/* Row 5: Payment Date | Balance */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field label="Payment Date" value={formatDate(data.paymentDate)} last />
            </View>
            <View style={styles.rightCell}>
              <Field label="Balance" value={formatCurrency(balance)} bold last />
            </View>
          </View>

          {/* Row 6: Amount Received | Next Installment */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field
                label="Amount Received"
                value={formatCurrency(data.amountPaid)}
                bold
                last
              />
            </View>
            <View style={styles.rightCell}>
              {nextInstallment && !isOneTime ? (
                <Field
                  label="Next Installment"
                  value={formatCurrency(nextInstallment.totalAmount)}
                  bold
                  last
                />
              ) : (
                <Field label="Next Installment" value="—" last />
              )}
            </View>
          </View>

          {/* Row 7: Payment Method | Due Date */}
          <View style={styles.tableRow}>
            <View style={styles.leftCell}>
              <Field label="Payment Method" value={fmtMode(data.paymentMode)} last />
            </View>
            <View style={styles.rightCell}>
              {nextInstallment && !isOneTime ? (
                <Field
                  label="Due Date"
                  value={formatDate(nextInstallment.dueDate)}
                  last
                />
              ) : (
                <Field label="Due Date" value="—" last />
              )}
            </View>
          </View>

          {/* Row 8: Transaction ID | (empty) */}
          <View style={styles.tableRowLast}>
            <View style={styles.leftCell}>
              <Field label="Transaction ID" value={data.referenceNumber ?? "—"} last />
            </View>
            <View style={styles.rightCell}>
              {/* empty right cell */}
            </View>
          </View>

        </View>

        {/* ── Signatures ── */}
        <View style={styles.signaturesSection}>

          {/* Left: Student/Parent */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>
              Student/Parent Name: {data.studentName ?? ""}
            </Text>
            <View style={{ marginTop: 8 }}>
              <Text style={styles.signatureLabel}>Signature</Text>
              <View
                style={{
                  width: 150,
                  borderBottomWidth: 1,
                  borderBottomColor: "#555555",
                  marginTop: 2,
                  marginLeft: 50,
                }}
              />
            </View>
          </View>

          {/* Right: Authorised Signatory */}
          <View style={styles.authorisedBlock}>
            <Text style={styles.authorisedLabel}>Authorised Signatory:</Text>
            <View style={styles.authorisedLine}>
              <Text style={styles.authorisedLineText}>
                For {env.name}
              </Text>
            </View>
          </View>

        </View>

        {/* ── Terms & Conditions ── */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms and conditions</Text>
          <Text style={styles.termItem}>
            {"1. This receipt is issued subject to realization of cheque and/or confirmation of payment from the respective bank,\n    payment gateway, or payment method used."}
          </Text>
          <Text style={styles.termItem}>
            {"2. This receipt must be carefully preserved and produced upon request for any verification, refund processing, or\n    account-related clarification."}
          </Text>
          <Text style={styles.termItem}>
            {"3. Fees once paid are strictly non-refundable and non-transferable under any circumstances, except where the Second\n    Party is eligible for refund under the officially defined fumigation period of one (1) month, subject to fulfilment of all\n    conditions specified in the Agreement."}
          </Text>
          <Text style={styles.termItem}>
            {"4. Failure to adhere to the agreed payment schedule may result in suspension or restriction of access to classes,\n    facilities, mentorship, assessments, and other services until all dues are cleared."}
          </Text>
          <Text style={styles.termItem}>
            {"5. The balance amount mentioned shall be payable as per the agreed schedule, and the student shall remain liable to\n    pay the full course fee irrespective of course completion, withdrawal, or termination."}
          </Text>
          <Text style={styles.termItem}>
            {"6. Any discrepancy in payment details must be reported within three (3) days from the date of receipt, failing which the\n    records maintained by the institution shall be treated as final and binding."}
          </Text>
        </View>

      </Page>
    </Document>
  )
}