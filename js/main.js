// ================================================================
// GRAPHICS ENGINE v3.0 - 모든 블록 등록
// ================================================================

// BLOCK-01: BASIC CHARTS
registerRenderer('table', renderTable);
registerRenderer('frequency-table', renderFrequencyTable);
registerRenderer('bar', renderBar);
registerRenderer('stacked-bar', renderStackedBar);
registerRenderer('histogram', renderHistogram);
registerRenderer('pie', renderPie);
registerRenderer('doughnut', renderDoughnut);
registerRenderer('line', renderLine);
registerRenderer('scatter', renderScatter);
registerRenderer('scatter-only', renderScatterOnly);
registerRenderer('radar', renderRadar);
registerRenderer('gauge', renderGauge);

// BLOCK-02: COORDINATE & GEOMETRY
registerRenderer('coordinate-plane', renderCoordinatePlane);
registerRenderer('functions', renderCoordinateFunctions);
registerRenderer('polynomials', renderCoordinatePolynomials);
registerRenderer('piecewise', renderCoordinatePiecewise);
registerRenderer('absolute', renderCoordinateAbsolute);
registerRenderer('system', renderCoordinateSystem);
registerRenderer('inequality', renderCoordinateInequality);
registerRenderer('rational', renderCoordinateRational);
registerRenderer('shape-polygon', renderShapePolygon);
registerRenderer('shape-circle', renderShapeCircle);
registerRenderer('shape-ellipse', renderShapeEllipse);
registerRenderer('shape-triangle', renderShapeTriangle);

// BLOCK-03: STATISTICS
registerRenderer('dot-plot', renderDotPlot);
registerRenderer('box-plot', renderBoxPlot);
registerRenderer('residual-plot', renderResidualPlot);
registerRenderer('normal-distribution', renderNormalDistribution);
registerRenderer('qq-plot', renderQQPlot);
registerRenderer('violin-plot', renderViolinPlot);
registerRenderer('stem-leaf', renderStemLeaf);

// BLOCK-04: AP CALCULUS
registerRenderer('derivative', renderDerivative);
registerRenderer('second-derivative', renderSecondDerivative);
registerRenderer('integral', renderIntegral);
registerRenderer('slope-field', renderSlopeField);
registerRenderer('euler-method', renderEulerMethod);
registerRenderer('taylor-series', renderTaylorSeries);
registerRenderer('maclaurin-series', renderMaclaurinSeries);
registerRenderer('polar-curve', renderPolarCurve);
registerRenderer('parametric-curve', renderParametricCurve);
registerRenderer('arc-length', renderArcLength);
registerRenderer('area-between-curves', renderAreaBetweenCurves);
registerRenderer('volume-revolution', renderVolumeRevolution);
registerRenderer('differential-equation', renderDifferentialEquation);
registerRenderer('phase-plane', renderPhasePlane);
registerRenderer('vector-field', renderVectorField);
registerRenderer('gradient-field', renderGradientField);
registerRenderer('laplacian', renderLaplacian);
registerRenderer('fourier-series', renderFourierSeries);

// BLOCK-05: AP STATISTICS
registerRenderer('normal-pdf', renderNormalPDF);
registerRenderer('normal-cdf', renderNormalCDF);
registerRenderer('t-distribution', renderTDistribution);
registerRenderer('chi-square', renderChiSquare);
registerRenderer('f-distribution', renderFDistribution);
registerRenderer('binomial', renderBinomial);
registerRenderer('poisson', renderPoisson);
registerRenderer('exponential-dist', renderExponentialDist);
registerRenderer('confidence-interval', renderConfidenceInterval);
registerRenderer('p-value', renderPValue);
registerRenderer('anova', renderANOVA);
registerRenderer('correlation-matrix', renderCorrelationMatrix);
registerRenderer('regression-line', renderRegressionLine);
registerRenderer('qq-plot', renderQQPlot);
registerRenderer('power-curve', renderPowerCurve);

// BLOCK-06: AP PHYSICS
registerRenderer('projectile-motion', renderProjectileMotion);
registerRenderer('shm', renderSHM);
registerRenderer('damped-oscillation', renderDampedOscillation);
registerRenderer('forced-oscillation', renderForcedOscillation);
registerRenderer('gravitational-field', renderGravitationalField);
registerRenderer('electric-field', renderElectricField);
registerRenderer('magnetic-field', renderMagneticField);
registerRenderer('rc-circuit', renderRCCircuit);
registerRenderer('rl-circuit', renderRLCircuit);
registerRenderer('lc-circuit', renderLCCircuit);
registerRenderer('blackbody', renderBlackbody);
registerRenderer('wave-interference', renderWaveInterference);
registerRenderer('doppler-effect', renderDopplerEffect);
registerRenderer('thermal-expansion', renderThermalExpansion);
registerRenderer('ideal-gas', renderIdealGas);
registerRenderer('kepler-orbit', renderKeplerOrbit);
registerRenderer('lens-equation', renderLensEquation);
registerRenderer('snell-law', renderSnellLaw);

// BLOCK-07: AP BIOLOGY & CHEMISTRY
registerRenderer('logistic-growth', renderLogisticGrowth);
registerRenderer('exponential-growth', renderExponentialGrowth);
registerRenderer('michaelis-menten', renderMichaelisMenten);
registerRenderer('hill-equation', renderHillEquation);
registerRenderer('hardy-weinberg', renderHardyWeinberg);
registerRenderer('bacterial-growth', renderBacterialGrowth);
registerRenderer('enzyme-kinetics', renderEnzymeKinetics);
registerRenderer('osmosis', renderOsmosis);
registerRenderer('rate-law', renderRateLaw);
registerRenderer('arrhenius', renderArrhenius);
registerRenderer('equilibrium-constant', renderEquilibriumConstant);
registerRenderer('ph-curve', renderPHCurve);
registerRenderer('beer-lambert', renderBeerLambert);
registerRenderer('van-hoff', renderVanHoff);
registerRenderer('reaction-coordinate', renderReactionCoordinate);
registerRenderer('phase-diagram', renderPhaseDiagram);
registerRenderer('cooling-curve', renderCoolingCurve);
registerRenderer('heating-curve', renderHeatingCurve);

// BLOCK-08: SAT SPECIAL
registerRenderer('sat-absolute', renderSATAbsolute);
registerRenderer('sat-inverse', renderSATInverse);
registerRenderer('sat-periodic', renderSATPeriodic);
registerRenderer('sat-log', renderSATLog);
registerRenderer('sat-exponential', renderSATExponential);
registerRenderer('sat-rational', renderSATRational);
registerRenderer('sat-radical', renderSATRadical);
registerRenderer('sat-piecewise', renderSATPiecewise);
registerRenderer('sat-system', renderSATSystem);
registerRenderer('sat-inequality', renderSATInequality);
registerRenderer('sat-transform', renderSATTransform);
registerRenderer('sat-parametric', renderSATParametric);

console.log('✅ All renderers registered (' + getSupportedTypes().length + ' types)');
