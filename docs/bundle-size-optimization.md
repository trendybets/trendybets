# Bundle Size Optimization

This document outlines the strategies implemented to optimize the bundle size of the TrendyBets application.

## Implemented Optimizations

### 1. Chart Library Standardization

- **Problem**: The application was using both `recharts` and `chart.js`, which added unnecessary weight to the bundle.
- **Solution**: Standardized on `chart.js` and removed `recharts` from components.
- **Components Updated**:
  - `trendy-games-view.tsx`: Replaced recharts with chart.js
  - `game-research-view-optimized.tsx`: Created a new optimized version using chart.js

### 2. Bundle Analysis Tools

- Added bundle analyzer configuration to Next.js config
- Created scripts for bundle analysis:
  - `npm run analyze`: Generates bundle analysis reports
  - `npm run analyze:detailed`: Provides detailed analysis and optimization suggestions

### 3. Selective Imports

- Replaced wildcard imports with specific component imports
- Example: `import { Line } from 'react-chartjs-2'` instead of importing the entire library

## Future Optimization Strategies

### 1. Dynamic Imports

For components that aren't needed on initial page load:

```javascript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('./Component'), {
  loading: () => <LoadingComponent />
});
```

### 2. Tree Shaking

- Ensure all dependencies support tree shaking
- Use ES modules (import/export) instead of CommonJS (require)

### 3. Code Splitting

- Split code at natural boundaries (routes, tabs, modals)
- Use React.lazy() and Suspense for component-level code splitting

### 4. Dependency Optimization

- Regularly audit dependencies with `npm ls` or `npm-check`
- Replace heavy libraries with lighter alternatives:
  - moment.js → date-fns
  - lodash → individual lodash functions or native JavaScript
  - jQuery → native JavaScript

### 5. Image Optimization

- Use next/image for automatic image optimization
- Implement responsive images with srcset
- Lazy load images below the fold

### 6. Memoization

- Use React.memo for expensive components
- Implement useCallback and useMemo for performance-critical functions
- Optimize component re-renders with proper dependency arrays

## Monitoring Bundle Size

To monitor bundle size changes:

1. Run `npm run analyze` before and after significant changes
2. Compare the bundle size reports
3. Identify any unexpected increases in bundle size
4. Address issues before they compound

## Resources

- [Next.js Documentation on Code Splitting](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Web.dev Guide to Performance Optimization](https://web.dev/fast/)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) 