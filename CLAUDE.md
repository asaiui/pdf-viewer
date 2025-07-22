# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Instructions
必ず日本語で返して（Always respond in Japanese）

## Project Overview

This is a Japanese PDF/SVG viewer web application called "スクールナビ" (`情報科学専門学校 学校案内 2026`) designed to display a school brochure with interactive navigation. It's a Progressive Web App (PWA) built with vanilla JavaScript, HTML, and CSS that supports both PDF and SVG rendering modes.

## Architecture

The application follows a modular architecture with a main controller class coordinating specialized modules:

### Core System
- **ISCPDFViewer** (main.js) - Main application controller that orchestrates all modules
- **SVGViewer** (svg-viewer.js) - High-performance SVG rendering system with caching and preload
- **CDNManager** (cdn-manager.js) - Manages external library loading and fallbacks
- **Config** (config.js) - Application configuration and constants

### UI & Navigation
- **FullscreenManager** (fullscreen-manager.js) - Handles fullscreen mode and related controls
- **MobileMenu** (mobile-menu.js) - Enhanced mobile navigation with swipe gestures and focus trap
- **MobileUIOptimizer** (mobile-ui-optimizer.js) - Mobile-specific UI optimizations
- **MobileTouchHandler** (mobile-touch-handler.js) - Touch interaction handling

### Responsive & Touch
- **TouchGestureManager** (touch-gesture-manager.js) - Touch and swipe gesture handling
- **ResponsiveLayoutManager** (responsive-layout-manager.js) - Adaptive layout management

### Analytics & Content
- **ContentAnalyzer** (content-analyzer.js) - Analyzes content for table of contents generation

### Note on Missing Modules
Several modules referenced in documentation may not exist in current codebase:
- PDFLoader, PageNavigator, ZoomManager functionality is integrated into main.js
- PerformanceMonitor, IntelligentPrefetch, AdaptiveQuality are not implemented
- ProgressiveLoader, ParallelRenderer, RenderWorker, RealtimeDashboard are not present

## Development Commands

Since this is a frontend-only application with no build process:

- **Local Development**: Use any static file server
  ```bash
  # Python 3.x
  python -m http.server 8000
  
  # Node.js serve package
  npx serve .
  
  # VS Code Live Server extension
  ```
- **Testing**: Manual testing in browser - no automated test framework
- **Deployment**: Deploy static files to any web server or GitHub Pages
- **Git Operations**: Standard git workflow (no pre-commit hooks or linting configured)

## Common Issues and Solutions

### SVG File Path Issues
- Ensure `SVG/` directory (uppercase) contains files named `page-0001.svg` to `page-0030.svg`
- Check HTML prefetch links use correct case-sensitive paths: `SVG/page-0001.svg`
- Verify server deployment includes all SVG files with correct directory structure

### Split Mode Navigation
- Split mode changes page navigation: left → right → next page's left half
- Methods `nextPage()` and `prevPage()` in main.js handle split mode logic
- Use `this.svgViewer.splitMode` property (not `getSplitMode()` method) to check split state

## File Structure

- `index.html` - Main application entry point with comprehensive table of contents
- `style.css` - Complete responsive styling with mobile-first approach
- `js/` - Modular JavaScript components (11 files currently)
  - `main.js` - Main application controller (ISCPDFViewer class)
  - `svg-viewer.js` - SVG rendering and caching system
  - `cdn-manager.js` - External library loading management
  - `config.js` - Application configuration
  - Mobile-specific modules: mobile-menu.js, mobile-ui-optimizer.js, mobile-touch-handler.js
  - Touch & responsive: touch-gesture-manager.js, responsive-layout-manager.js
  - UI components: fullscreen-manager.js, content-analyzer.js
- `SVG/` - SVG files with naming pattern `page-NNNN.svg` (30 files, pages 0001-0030)
- `pdf/` - PDF files (`test.pdf`, `school-guide-2026.pdf`)
- `Demo/` - Fallback demo content with book-flip effect
- `manifest.json` - PWA configuration with shortcuts and icons
- `sw.js` - Service Worker for PWA functionality
- `uploads/` - Usage tracking JSON files

## Important Implementation Details

### Current Implementation Status
The application primarily operates in **SVG Mode**:
- **SVG Mode**: Primary and currently implemented mode using optimized SVG files from `SVG/` directory
- **PDF Mode**: Referenced in code but not fully implemented (PDF.js integration incomplete)
- **Demo Mode**: Fallback content available in `Demo/` directory with book-flip effect

### Split Screen Feature
The application includes a split-screen mode for viewing pages:
- **Left/Right Split**: Pages can be split vertically to show left or right halves
- **Navigation Flow**: Left half → Right half → Next page's left half
- **Controls**: Toggle with 'S' key or split button, click split indicator to switch sides

### SVG Loading Strategy
SVG files are loaded from `SVG/page-NNNN.svg` with:
- Intelligent caching system (max 10 files)
- Preload queue for adjacent pages
- Optimized SVG element processing with responsive attributes

### Responsive Architecture
- **Desktop (1024px+)**: Full sidebar + main content layout
- **Tablet (769px-1023px)**: Collapsible sidebar with overlay
- **Mobile (481px-768px)**: Hamburger menu with enhanced mobile controls
- **Small Mobile (≤480px)**: Compact layout with minimal controls

### Performance Optimization
- **Lazy Loading**: Pages loaded on-demand with intelligent prefetching
- **Memory Management**: LRU cache for SVG elements
- **Progressive Enhancement**: Features added based on device capabilities
- **Worker Threading**: Background processing for intensive operations

### Touch & Gesture Support
- **Swipe Navigation**: Left/right swipe for page navigation
- **Pinch Zoom**: Native zoom gestures on touch devices
- **Focus Management**: Proper focus trap for mobile menu
- **Accessibility**: Full keyboard navigation and screen reader support

### Module Communication Pattern
All modules receive a reference to the main viewer instance (`this.viewer`), enabling:
- Cross-module event communication
- Centralized state management
- Consistent error handling
- Shared DOM element access

### Error Handling Strategy
The application implements graceful degradation:
1. **Primary**: SVG rendering from dedicated files
2. **Secondary**: PDF.js fallback rendering
3. **Tertiary**: Demo content with static pages
4. **Quaternary**: Error page with user guidance

### Browser Requirements
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- iOS Safari 14+, Android Chrome 90+
- JavaScript ES2020+ features required
- Web Workers and Fetch API support

### Key Configuration Values
- Primary brand color: #0066CC (ISC Blue)
- Accent color: #FF6600 (Orange)
- Default zoom: 1.2x
- Mobile breakpoint: 768px
- SVG cache size: 10 files
- Total pages: 30 (configurable in main.js)

### PWA Features
- Installable app with manifest.json
- Offline-capable (partial)
- App shortcuts for quick navigation
- Custom icons and branding
- Native-like experience on mobile devices