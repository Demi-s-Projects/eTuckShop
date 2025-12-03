/**
 * Owner Reports Page
 *
 * Full report generation tool with:
 * - Date range and report type selection
 * - Data fetching from API
 * - Column selection, filtering, and sorting
 * - CSV export
 */

"use client";

import { useState } from "react";
import { useAuth, formatDashboardUser } from "@/context/AuthContext";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/Reports.module.css";

type ReportType = "sales" | "items" | null;

interface SalesData {
	OrderID: string;
	OrderTime: string;
	displayName: string;
	TotalPrice: number;
	status: string;
}

interface ItemData {
	itemID: string;
	name: string;
	category: string;
	price: number;
	quantity: number;
}

export default function OwnerReportsPage() {
	// Get auth state from centralized context
	const { user: authUser, loading: authLoading } = useAuth();
	const user = formatDashboardUser(authUser, "Owner");

	// Report generation state
	const [reportType, setReportType] = useState<ReportType>(null);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [rawData, setRawData] = useState<SalesData[] | ItemData[]>([]);
	const [dataLoading, setDataLoading] = useState(false);
	const [dataError, setDataError] = useState("");

	// Table state
	const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
	const [allAvailableColumns, setAllAvailableColumns] = useState<string[]>([]);
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortAsc, setSortAsc] = useState(true);
	const [filterText, setFilterText] = useState("");

	if (authLoading) {
		return <div style={{ padding: 24 }}>Loading...</div>;
	}

	// Fetch data from API
	async function fetchReportData() {
		if (!reportType || !startDate || !endDate) {
			setDataError("Please select report type and date range");
			return;
		}

		setDataLoading(true);
		setDataError("");
		setRawData([]);
		setSelectedColumns(new Set());
		setAllAvailableColumns([]);

		try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const endpoint =
				reportType === "sales"
					? `/api/reports/sales?startDate=${startDate}&endDate=${endDate}&timeZone=${timezone}`
					: `/api/reports/items?startDate=${startDate}&endDate=${endDate}`;
            
            const token = await authUser?.firebaseUser?.getIdToken();
			const response = await fetch(endpoint, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch ${reportType} data`);
			}

			const data = await response.json();
			setRawData(data.data || []);

			// Track all available columns and auto-select on first load
			if (data.data && data.data.length > 0) {
				const columns = Object.keys(data.data[0]);
				setAllAvailableColumns(columns);
				setSelectedColumns(new Set(columns));
			}
		} catch (err) {
			setDataError(err instanceof Error ? err.message : "Failed to fetch data");
		} finally {
			setDataLoading(false);
		}
	}

	// Get visible columns
	const visibleColumns = Array.from(selectedColumns);

	// Filter and sort data
	const filteredData = rawData.filter((row) => {
		if (!filterText) return true;
		const searchLower = filterText.toLowerCase();
		return visibleColumns.some((col) => {
			const val = String(((row as unknown) as Record<string, unknown>)[col] || "").toLowerCase();
			return val.includes(searchLower);
		});
	});

	const sortedData = [...filteredData].sort((a, b) => {
		if (!sortColumn) return 0;
		const aVal = ((a as unknown) as Record<string, unknown>)[sortColumn];
		const bVal = ((b as unknown) as Record<string, unknown>)[sortColumn];

		const aNum = typeof aVal === "number" ? aVal : String(aVal).toLowerCase();
		const bNum = typeof bVal === "number" ? bVal : String(bVal).toLowerCase();

		if (aNum < bNum) return sortAsc ? -1 : 1;
		if (aNum > bNum) return sortAsc ? 1 : -1;
		return 0;
	});

	// Download functions
	function downloadBlob(data: BlobPart, filename: string, mime: string) {
		const blob = new Blob([data], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function downloadCSV() {
		const rows: string[][] = [];
		// Header
		rows.push(visibleColumns);
		// Data
		sortedData.forEach((row) => {
			rows.push(visibleColumns.map((col) => String(((row as unknown) as Record<string, unknown>)[col] || "")));
		});

		const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
		const filename = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
		downloadBlob(csv, filename, "text/csv");
	}

	return (
		<Dashboard user={user} theme="blue">
			<div className={styles.container}>
				<h1 className={styles.pageTitle}>Report Generator</h1>

				{/* Configuration Section */}
				{reportType === null && (
					<div className={styles.configSection}>
						<h2>Select Report Type</h2>
						<div className={styles.reportTypeButtons}>
							<button
								className={styles.typeButton}
								onClick={() => setReportType("sales")}
							>
								📈 Sales Report
							</button>
							<button
								className={styles.typeButton}
								onClick={() => setReportType("items")}
							>
								📦 Item Report
							</button>
						</div>
					</div>
				)}

				{/* Date Range & Generate */}
				{reportType !== null && (
					<div className={styles.configSection}>
						<div className={styles.controls}>
							<div className={styles.dateInputGroup}>
								<label>Start Date:</label>
								<input
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className={styles.input}
								/>
							</div>
							<div className={styles.dateInputGroup}>
								<label>End Date:</label>
								<input
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									className={styles.input}
								/>
							</div>
							<button onClick={fetchReportData} className={styles.generateBtn} disabled={dataLoading}>
								{dataLoading ? "Loading..." : "Generate Report"}
							</button>
							<button onClick={() => {
								setReportType(null);
								setRawData([]);
								setSelectedColumns(new Set());
								setStartDate("");
								setEndDate("");
							}} className={styles.backBtn}>
								Back
							</button>
						</div>
					</div>
				)}

			{/* Error message */}
			{dataError && <div className={styles.error}>{dataError}</div>}

			{/* No data found message */}
			{!dataLoading && reportType !== null && rawData.length === 0 && !dataError && (
				<div className={styles.noDataMessage}>
					<p>No data found for the selected date range.</p>
					<p>Try selecting a different date range or report type.</p>
				</div>
			)}

			{/* Data found - show tools */}
			{rawData.length > 0 && (
					<div className={styles.dataSection}>
						{/* Column selector */}
						<div className={styles.columnSelector}>
							<div className={styles.columnSelectorHeader}>
								<h3>Columns:</h3>
								<button
									className={styles.toggleAllBtn}
									onClick={() => {
										if (selectedColumns.size === allAvailableColumns.length) {
											setSelectedColumns(new Set());
										} else {
											setSelectedColumns(new Set(allAvailableColumns));
										}
									}}
								>
									{selectedColumns.size === allAvailableColumns.length ? "Deselect All" : "Select All"}
								</button>
							</div>
							<div className={styles.columnCheckboxes}>
								{allAvailableColumns.map((col) => (
									<label key={col} className={styles.checkboxLabel}>
										<input
											type="checkbox"
											checked={selectedColumns.has(col)}
											onChange={(e) => {
												const newSet = new Set(selectedColumns);
												if (e.target.checked) {
													newSet.add(col);
												} else {
													newSet.delete(col);
												}
												setSelectedColumns(newSet);
											}}
										/>
										{col}
									</label>
								))}
							</div>
						</div>

						{/* Filter */}
						<div className={styles.filterSection}>
							<input
								type="text"
								placeholder="Filter data..."
								value={filterText}
								onChange={(e) => setFilterText(e.target.value)}
								className={styles.input}
							/>
						</div>

						{/* Data table */}
						<div className={styles.tableContainer}>
							<table className={styles.table}>
								<thead>
									<tr>
										{visibleColumns.map((col) => (
											<th
												key={col}
												onClick={() => {
													if (sortColumn === col) {
														setSortAsc(!sortAsc);
													} else {
														setSortColumn(col);
														setSortAsc(true);
													}
												}}
												className={styles.sortableHeader}
											>
												{col}
												{sortColumn === col && (sortAsc ? " ▲" : " ▼")}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{sortedData.map((row, idx) => (
										<tr key={idx}>
											{visibleColumns.map((col) => (
												<td key={col}>{String(((row as unknown) as Record<string, unknown>)[col] || "")}</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Download buttons */}
						<div className={styles.downloadSection}>
							<button onClick={downloadCSV} className={styles.downloadBtn}>
								📥 Download CSV
							</button>
						</div>

						<p className={styles.rowCount}>
							Showing {sortedData.length} of {rawData.length} rows
						</p>
					</div>
				)}
			</div>
		</Dashboard>
	);
}
