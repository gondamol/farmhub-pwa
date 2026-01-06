/**
 * FarmHub - 5-Year Projection Module
 * Financial planning calculator for goat farming
 */

const Projections = {
    // Default assumptions for East African goat farming
    defaults: {
        // Breeding parameters
        kiddingRate: 1.5,           // Kids per doe per year
        kidSurvivalRate: 0.85,      // 85% survival rate
        femaleRatio: 0.5,           // 50% of kids are female
        femaleRetentionRate: 0.7,   // Keep 70% of female kids
        breedingAgeMonths: 12,      // Start breeding at 12 months

        // Financial parameters (KES)
        maleSalePrice: 7000,        // Sale price for males
        femaleSalePrice: 6000,      // Sale price for females (if sold)
        adultSalePrice: 9000,       // Sale price for adult goats
        cullingRate: 0.1,           // 10% of does culled annually

        // Operating costs (KES per month)
        feedCostPerGoat: 300,       // Monthly feed cost per goat
        vetCostPerGoat: 50,         // Monthly vet cost per goat
        laborCost: 5000,            // Monthly labor cost
        overheadCost: 2000,         // Monthly overhead

        // Initial investment
        buckPrice: 15000,           // Cost of a buck
        doePrice: 8000,             // Cost of a doe
        housingCost: 50000,         // Initial housing setup
    },

    /**
     * Calculate 5-year projection based on parameters
     */
    calculate(params) {
        const p = { ...this.defaults, ...params };
        const years = [];

        let currentDoes = p.startingDoes || 20;
        let currentBucks = p.startingBucks || 2;
        let totalInvestment = p.initialInvestment ||
            (p.startingDoes * p.doePrice + p.startingBucks * p.buckPrice + p.housingCost);

        let cumulativeProfit = -totalInvestment;
        let cumulativeIncome = 0;
        let cumulativeExpenses = totalInvestment;

        for (let year = 1; year <= 5; year++) {
            // Calculate births
            const totalKidsBorn = Math.floor(currentDoes * p.kiddingRate);
            const kidsForYear = year === 1 ? Math.floor(totalKidsBorn * 0.5) : totalKidsBorn; // First year partial
            const kidsSurvived = Math.floor(kidsForYear * p.kidSurvivalRate);

            const femaleKids = Math.floor(kidsSurvived * p.femaleRatio);
            const maleKids = kidsSurvived - femaleKids;

            // Retention decisions
            const femalesRetained = Math.floor(femaleKids * p.femaleRetentionRate);
            const femalesSold = femaleKids - femalesRetained;
            const malesSold = maleKids;

            // Culling
            const doesCulled = Math.floor(currentDoes * p.cullingRate);

            // Calculate average herd size for the year
            const avgHerdSize = currentDoes + currentBucks + (kidsSurvived / 2);

            // Income
            const maleIncome = malesSold * p.maleSalePrice;
            const femaleIncome = femalesSold * p.femaleSalePrice;
            const cullIncome = doesCulled * p.adultSalePrice;
            const totalIncome = maleIncome + femaleIncome + cullIncome;

            // Expenses
            const feedCost = Math.floor(avgHerdSize * p.feedCostPerGoat * 12);
            const vetCost = Math.floor(avgHerdSize * p.vetCostPerGoat * 12);
            const laborCost = p.laborCost * 12;
            const overheadCost = p.overheadCost * 12;
            const totalExpenses = feedCost + vetCost + laborCost + overheadCost;

            // Profit
            const yearProfit = totalIncome - totalExpenses;
            cumulativeProfit += yearProfit;
            cumulativeIncome += totalIncome;
            cumulativeExpenses += totalExpenses;

            // Update herd for next year
            currentDoes = currentDoes - doesCulled + femalesRetained;

            // Buy additional buck if herd grows too large
            if (currentDoes > currentBucks * 25 && year < 5) {
                currentBucks++;
                cumulativeExpenses += p.buckPrice;
                cumulativeProfit -= p.buckPrice;
            }

            years.push({
                year,
                startingDoes: Math.floor(currentDoes - femalesRetained + doesCulled),
                endingDoes: currentDoes,
                bucks: currentBucks,
                totalHerd: currentDoes + currentBucks,

                kidsBorn: kidsForYear,
                kidsSurvived,
                malesSold,
                femalesSold,
                femalesRetained,
                doesCulled,

                income: {
                    males: maleIncome,
                    females: femaleIncome,
                    culling: cullIncome,
                    total: totalIncome
                },

                expenses: {
                    feed: feedCost,
                    vet: vetCost,
                    labor: laborCost,
                    overhead: overheadCost,
                    total: totalExpenses
                },

                profit: yearProfit,
                cumulativeProfit,
                cumulativeIncome,
                cumulativeExpenses,

                // Calculate ROI
                roi: ((cumulativeProfit + totalInvestment) / totalInvestment) * 100 - 100
            });
        }

        // Find break-even point
        let breakEvenMonth = null;
        let runningProfit = -totalInvestment;

        for (let i = 0; i < years.length; i++) {
            const yearProfit = years[i].profit;
            const monthlyProfit = yearProfit / 12;

            for (let month = 1; month <= 12; month++) {
                runningProfit += monthlyProfit;
                if (runningProfit >= 0 && breakEvenMonth === null) {
                    breakEvenMonth = (i * 12) + month;
                }
            }
        }

        return {
            parameters: p,
            initialInvestment: totalInvestment,
            years,
            summary: {
                finalHerdSize: years[4].totalHerd,
                finalHerdValue: years[4].endingDoes * p.doePrice + years[4].bucks * p.buckPrice,
                totalIncome: cumulativeIncome,
                totalExpenses: cumulativeExpenses,
                netProfit: cumulativeProfit,
                finalROI: years[4].roi,
                breakEvenMonth: breakEvenMonth,
                breakEvenYear: breakEvenMonth ? (breakEvenMonth / 12).toFixed(1) : 'N/A'
            }
        };
    },

    /**
     * Format money for display
     */
    formatMoney(amount) {
        return 'KES ' + Math.round(amount).toLocaleString();
    },

    /**
     * Generate HTML report
     */
    generateReport(projection) {
        const p = projection;
        const s = p.summary;

        let yearRows = '';
        for (const year of p.years) {
            yearRows += `
                <tr>
                    <td>${year.year}</td>
                    <td>${year.endingDoes}</td>
                    <td>${year.totalHerd}</td>
                    <td>${year.kidsBorn}</td>
                    <td>${year.malesSold}</td>
                    <td class="text-success">${this.formatMoney(year.income.total)}</td>
                    <td class="text-danger">${this.formatMoney(year.expenses.total)}</td>
                    <td class="${year.profit >= 0 ? 'text-success' : 'text-danger'}">${this.formatMoney(year.profit)}</td>
                    <td class="${year.cumulativeProfit >= 0 ? 'text-success' : 'text-danger'}">${this.formatMoney(year.cumulativeProfit)}</td>
                </tr>
            `;
        }

        return `
            <div class="projection-report">
                <!-- Summary Cards -->
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card" style="background: var(--primary-50);">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="font-size: 20px;">${s.finalHerdSize}</span>
                            <span class="stat-label">Final Herd Size</span>
                        </div>
                    </div>
                    <div class="stat-card" style="background: #dcfce7;">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="font-size: 16px; color: var(--success);">${this.formatMoney(s.netProfit)}</span>
                            <span class="stat-label">5-Year Net Profit</span>
                        </div>
                    </div>
                    <div class="stat-card" style="background: #fef3c7;">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="font-size: 20px;">${s.finalROI.toFixed(0)}%</span>
                            <span class="stat-label">ROI</span>
                        </div>
                    </div>
                    <div class="stat-card" style="background: #dbeafe;">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="font-size: 18px;">${s.breakEvenYear} yrs</span>
                            <span class="stat-label">Break-Even</span>
                        </div>
                    </div>
                </div>
                
                <!-- Key Metrics -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-calculator"></i> Financial Summary</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between;">
                            <span>Initial Investment</span>
                            <strong>${this.formatMoney(p.initialInvestment)}</strong>
                        </div>
                        <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between;">
                            <span>5-Year Total Income</span>
                            <strong class="text-success">${this.formatMoney(s.totalIncome)}</strong>
                        </div>
                        <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between;">
                            <span>5-Year Total Expenses</span>
                            <strong class="text-danger">${this.formatMoney(s.totalExpenses)}</strong>
                        </div>
                        <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between;">
                            <span>Final Herd Value</span>
                            <strong>${this.formatMoney(s.finalHerdValue)}</strong>
                        </div>
                        <div style="padding: 12px 16px; display: flex; justify-content: space-between; background: var(--primary-50);">
                            <span><strong>Total Return (Profit + Herd)</strong></span>
                            <strong style="color: var(--primary-700);">${this.formatMoney(s.netProfit + s.finalHerdValue)}</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Yearly Breakdown -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-chart-bar"></i> Year-by-Year Projection</h3>
                    </div>
                    <div class="card-body" style="padding: 0; overflow-x: auto;">
                        <table style="width: 100%; min-width: 600px; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: var(--gray-100);">
                                    <th style="padding: 12px 8px; text-align: left;">Year</th>
                                    <th style="padding: 12px 8px; text-align: left;">Does</th>
                                    <th style="padding: 12px 8px; text-align: left;">Herd</th>
                                    <th style="padding: 12px 8px; text-align: left;">Kids</th>
                                    <th style="padding: 12px 8px; text-align: left;">Sold</th>
                                    <th style="padding: 12px 8px; text-align: left;">Income</th>
                                    <th style="padding: 12px 8px; text-align: left;">Expenses</th>
                                    <th style="padding: 12px 8px; text-align: left;">Profit</th>
                                    <th style="padding: 12px 8px; text-align: left;">Cumulative</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${yearRows}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Assumptions -->
                <div class="card" style="margin-top: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-sliders-h"></i> Assumptions Used</h3>
                    </div>
                    <div class="card-body" style="font-size: 13px; color: var(--gray-600);">
                        <p>• Kidding rate: ${p.parameters.kiddingRate} kids/doe/year</p>
                        <p>• Kid survival rate: ${(p.parameters.kidSurvivalRate * 100).toFixed(0)}%</p>
                        <p>• Female retention: ${(p.parameters.femaleRetentionRate * 100).toFixed(0)}%</p>
                        <p>• Male sale price: ${this.formatMoney(p.parameters.maleSalePrice)}</p>
                        <p>• Monthly feed cost: ${this.formatMoney(p.parameters.feedCostPerGoat)}/goat</p>
                    </div>
                </div>
            </div>
        `;
    }
};

// Export
window.Projections = Projections;
