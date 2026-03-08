# Carousel Action Documentation

The carousel action provides a unified way to implement image carousels across different block patterns. It supports navigation buttons, thumbnails, or both, and includes accessibility features and touch support. It uses container queries for more reliable layouts that respond to their container rather than the viewport.

## Usage

Add the `carousel` action to a container block that contains your carousel structure:

```html
<!-- wp:group {"className":"your-carousel","customAction":"carousel"} -->
<div class="wp-block-group your-carousel" data-action="carousel">
    <!-- Carousel structure here -->
</div>
<!-- /wp:group -->
```

## HTML Structure

The carousel action supports two structure options:

### Option 1: Nested Structure (Original)
In this approach, the block with the action contains a separate carousel container:

```html
<div class="wp-block-group your-carousel" data-action="carousel">
    <!-- Container (required) -->
    <div class="carousel-container">
        <!-- Slider (required) -->
        <div class="carousel-slider">
            <!-- Slides (required) -->
            <div class="carousel-slide"><!-- Image 1 --></div>
            <div class="carousel-slide"><!-- Image 2 --></div>
            <div class="carousel-slide"><!-- Image 3 --></div>
        </div>
    </div>
    
    <!-- Navigation buttons (optional) -->
    <div class="carousel-button-left"><!-- Left button --></div>
    <div class="carousel-button-right"><!-- Right button --></div>
    
    <!-- Thumbnails (optional) -->
    <div class="carousel-thumbnails">
        <div class="carousel-thumbnail"><!-- Thumbnail 1 --></div>
        <div class="carousel-thumbnail"><!-- Thumbnail 2 --></div>
        <div class="carousel-thumbnail"><!-- Thumbnail 3 --></div>
    </div>
</div>
```

### Option 2: Simplified Structure (New)
Alternatively, the block itself can be the carousel container by adding the `carousel-container` class:

```html
<div class="wp-block-group your-carousel carousel-container" data-action="carousel">
    <!-- Slider (required) -->
    <div class="carousel-slider">
        <!-- Slides (required) -->
        <div class="carousel-slide"><!-- Image 1 --></div>
        <div class="carousel-slide"><!-- Image 2 --></div>
        <div class="carousel-slide"><!-- Image 3 --></div>
    </div>
    
    <!-- Navigation buttons (optional) -->
    <div class="carousel-button-left"><!-- Left button --></div>
    <div class="carousel-button-right"><!-- Right button --></div>
    
    <!-- Thumbnails (optional) -->
    <div class="carousel-thumbnails">
        <div class="carousel-thumbnail"><!-- Thumbnail 1 --></div>
        <div class="carousel-thumbnail"><!-- Thumbnail 2 --></div>
        <div class="carousel-thumbnail"><!-- Thumbnail 3 --></div>
    </div>
</div>
```

### Alternative Class Names

For consistency with existing patterns, these alternative class names are also supported:

| Component | Primary Class | Alternative Classes |
|-----------|--------------|---------------------|
| Container | `carousel-container` | `gallery-container` |
| Slider | `carousel-slider` | `gallery-slider`, `gallery-images-wrapper` |
| Slides | `carousel-image` | `gallery-image`, `gallery-image-container` |
| Previous Button | `carousel-button-left` | `gallery-button-left` |
| Next Button | `carousel-button-right` | `gallery-button-right` |
| Thumbnails Container | `carousel-thumbnails` | `gallery-thumbnails` |
| Thumbnail | `carousel-thumbnail` | `gallery-thumbnail`, `wp-block-image` (inside thumbnails container) |

## Container Queries

This carousel uses container queries to create more reliable layouts. Container queries allow the carousel to respond to its container size rather than the viewport size. The carousel script:

1. Applies `container: carousel / inline-size` to the main container
2. Uses `100cqw` units (container query width) to size elements
3. Sets up responsive behavior based on the container size

This approach ensures that your carousel works correctly even when nested inside other layouts, sidebars, or complex grid systems.

## Example Implementations

### 1. Basic Carousel with Navigation Buttons

```html
<div class="wp-block-group product-carousel" data-action="carousel">
    <div class="carousel-container">
        <div class="carousel-slider">
            <figure class="carousel-image">
                <img src="image1.jpg" alt="Product image 1" />
            </figure>
            <figure class="carousel-image">
                <img src="image2.jpg" alt="Product image 2" />
            </figure>
        </div>
    </div>

    <div class="carousel-button carousel-button-left">
        <svg><!-- Left arrow icon --></svg>
    </div>
    
    <div class="carousel-button carousel-button-right">
        <svg><!-- Right arrow icon --></svg>
    </div>
</div>
```

### 2. Gallery with Thumbnails

```html
<div class="wp-block-group gallery" data-action="carousel">
    <div class="gallery-container">
        <div class="gallery-slider">
            <div class="gallery-image">
                <img src="image1.jpg" alt="Gallery image 1" />
                <p class="gallery-caption">Caption 1</p>
            </div>
            <div class="gallery-image">
                <img src="image2.jpg" alt="Gallery image 2" />
                <p class="gallery-caption">Caption 2</p>
            </div>
        </div>
    </div>
    
    <div class="gallery-thumbnails">
        <div class="gallery-thumbnail">
            <img src="thumbnail1.jpg" alt="Thumbnail 1" />
        </div>
        <div class="gallery-thumbnail">
            <img src="thumbnail2.jpg" alt="Thumbnail 2" />
        </div>
    </div>
</div>
```

### 3. Complete Example with Buttons and Thumbnails

```html
<div class="wp-block-group magazine-gallery" data-action="carousel">
    <div class="carousel-container">
        <!-- Navigation buttons within container -->
        <div class="carousel-button carousel-button-left">
            <a class="wp-block-button__link">←</a>
        </div>
    
        <div class="carousel-slider">
            <div class="carousel-image">
                <img src="image1.jpg" alt="Magazine image 1" />
                <p class="caption">Caption text 1</p>
            </div>
            <div class="carousel-image">
                <img src="image2.jpg" alt="Magazine image 2" />
                <p class="caption">Caption text 2</p>
            </div>
        </div>
        
        <div class="carousel-button carousel-button-right">
            <a class="wp-block-button__link">→</a>
        </div>
    </div>
    
    <div class="carousel-thumbnails">
        <div class="carousel-thumbnail">
            <img src="thumbnail1.jpg" alt="Thumbnail 1" />
        </div>
        <div class="carousel-thumbnail">
            <img src="thumbnail2.jpg" alt="Thumbnail 2" />
        </div>
    </div>
</div>
```

## Styling Guide

The carousel action handles the interactive functionality but relies on CSS for visual styling. Here's a basic CSS template that includes container query support:

```css
/* Container */
.carousel-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    container: carousel / inline-size; /* Container query setup */
    min-height: 400px;
}

/* Slider */
.carousel-slider {
    display: flex;
    flex-wrap: nowrap;
    position: relative;
    left: 0;
    transition: left 0.4s ease-in-out;
}

/* Slides */
.carousel-image {
    width: 100cqw !important; /* Container query width unit */
    min-width: 100cqw;
    flex: 0 0 100cqw;
}

/* Images inside slides */
.carousel-image img {
    width: 100cqw;
    height: auto;
    object-fit: contain;
}

/* Navigation buttons */
.carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    cursor: pointer;
}

.carousel-button-left {
    left: 10px;
}

.carousel-button-right {
    right: 10px;
}

.carousel-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Thumbnails */
.carousel-thumbnails {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 10px;
}

.carousel-thumbnail {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.3s;
}

.carousel-thumbnail.active {
    opacity: 1;
    border: 2px solid currentColor;
}

/* Container query based responsive adjustments */
@container carousel (max-width: 768px) {
    .carousel-button {
        transform: translateY(-50%) scale(0.8);
    }
    
    .carousel-thumbnails {
        gap: 0.25rem;
    }
}
```

## Accessibility Features

The carousel action includes the following accessibility features:

- Proper ARIA roles and attributes for carousel components
- Keyboard navigation (arrow keys, Home, End)
- Focus management
- Screen reader support
- Touch support for mobile devices

## Browser Support

The carousel action is compatible with:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)

Note: Container queries are supported in all modern browsers, but for older browsers, you may need to provide fallbacks.

## Interactivity API (v2.0.0)

When the Interactivity API is enabled (Settings > Block Actions > "Use Interactivity API"), the carousel action uses a fully reactive store instead of imperative DOM manipulation.

### How It Works

The PHP `Carousel` renderer (`includes/renderers/class-carousel.php`) injects Interactivity API directives into the block HTML at render time:

- **Root element**: `data-wp-interactive="block-actions/carousel"`, `data-wp-context`, `data-wp-init`, `data-wp-on--keydown`
- **Navigation buttons**: `data-wp-on--click="actions.prevSlide"` / `actions.nextSlide`
- **Slides**: `data-wp-context` (per-slide index), `data-wp-class--active`, `data-wp-bind--aria-hidden`
- **Thumbnails**: `data-wp-on--click="actions.goToSlide"`, `data-wp-class--active`
- **Slider**: `data-wp-style--transform="state.sliderTransform"` (reactive CSS transform)

### Reactive State

The carousel store (`src/stores/carousel/view.js`) uses derived state getters:

| Getter | Description |
|--------|-------------|
| `state.sliderTransform` | CSS `translateX()` value based on `currentIndex` |
| `state.isPrevDisabled` | Whether previous button should be disabled |
| `state.isNextDisabled` | Whether next button should be disabled |
| `state.isSlideActive` | Whether the current slide matches context `slideIndex` |

### Hybrid Approach

The carousel uses a hybrid of reactive directives and imperative setup:
- **Reactive**: Slide transforms, active states, disabled buttons (via directives)
- **Imperative** (in `callbacks.init`): Accessibility attributes, touch event listeners, IntersectionObserver for lazy loading, RAF-based animation

This approach provides the best of both worlds: declarative reactivity where it simplifies code, and imperative control for complex DOM setup that directives can't express.

### Context

The initial context injected by the PHP renderer:

```json
{
    "currentIndex": 0,
    "isAnimating": false,
    "totalSlides": 0,
    "wrapAround": true
}
```

`totalSlides` is set dynamically by `callbacks.init()` from the DOM.

## Best Practices

1. Always provide alternative navigation (buttons and/or thumbnails)
2. Use appropriate image aspect ratios to prevent content jumps
3. Optimize images for performance
4. Include meaningful alt text for all images
5. Consider adding autoplay functionality only when appropriate and with user controls
6. Test with keyboard navigation and screen readers
7. Let the carousel handle layout with container queries rather than forcing specific dimensions
8. For images with specific aspect ratios, use the `style="aspect-ratio: 16/9"` attribute
