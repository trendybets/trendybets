const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run the build with analyzer
console.log('Building with bundle analyzer...');
execSync('npm run analyze', { stdio: 'inherit' });

// Read the client bundle report
const clientReportPath = path.join(__dirname, '..', '.next', 'analyze', 'client.html');
if (fs.existsSync(clientReportPath)) {
  console.log('\nClient bundle report generated at:', clientReportPath);
  console.log('Open this file in your browser to view the detailed bundle analysis.');
}

// Provide optimization suggestions
console.log('\n--- Bundle Size Optimization Suggestions ---');
console.log('1. Use dynamic imports for large components that are not needed on initial load');
console.log('   Example: const DynamicComponent = dynamic(() => import("./Component"), { loading: () => <LoadingComponent /> })');
console.log('\n2. Avoid importing entire libraries when only specific components are needed');
console.log('   Example: import { Button } from "ui-library" instead of import * from "ui-library"');
console.log('\n3. Consider using smaller alternatives for large dependencies');
console.log('   Example: Use date-fns instead of moment.js for date manipulation');
console.log('\n4. Implement code splitting at the route level');
console.log('   Next.js does this automatically, but ensure you\'re not importing unnecessary components in your pages');
console.log('\n5. Use the React.lazy() and Suspense for component-level code splitting');
console.log('\n6. Optimize images using next/image and consider lazy loading images below the fold');
console.log('\n7. Remove unused dependencies from your package.json');
console.log('\n8. Consider using tree-shakable libraries');
console.log('\n9. Implement proper memoization to avoid unnecessary re-renders');
console.log('\n10. Use lightweight alternatives for heavy UI components');

console.log('\nRun "npm run analyze" anytime to generate updated bundle reports.'); 