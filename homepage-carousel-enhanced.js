/**
 * Hero section carousel for the homepage (Enhanced Version).
 * Continuously scrolls images from right to left in a seamless loop.
 * 
 * Enhanced with:
 * - BaseAction logging for debugging
 * - Better error handling
 * - Cleanup on page unload
 * 
 * Usage: Add this file to your theme's /actions folder.
 * 
 * @param {HTMLElement} element The carousel container element.
 */

(function() {
	'use strict';

	// Get BaseAction class from global API
	const { BaseAction } = window.BlockActions;

	function init(element) {
		const action = new BaseAction(element);

		// Find the inner track that holds the images
		const track = element.querySelector('.homepage-hero__track');
		
		if (!track) {
			action.log('error', 'Homepage carousel: .homepage-hero__track not found');
			return;
		}

		// Clone the track to create seamless loop
		const clone = track.cloneNode(true);
		element.insertBefore(clone, track.nextSibling);

		// Animation settings
		const speed = 0.5; // pixels per frame (adjust for faster/slower movement)
		let position = 0;
		let animationId = null;

		// Calculate width of the track
		const getTrackWidth = () => {
			return track.offsetWidth;
		};

		// Calculate opacity based on position in viewport
		const calculateOpacity = (imageElement) => {
			const rect = imageElement.getBoundingClientRect();
			const imageCenterX = rect.left + (rect.width / 2);
			const viewportCenterX = window.innerWidth / 2;
			const viewportWidth = window.innerWidth;
			
			// Distance from center (0 = center, 1 = edge)
			const distanceFromCenter = Math.abs(imageCenterX - viewportCenterX) / (viewportWidth / 2);
			
			// Map distance to opacity range (0.1 at center, 0.8 at edges)
			const opacity = 0.1 + (distanceFromCenter * 0.6);
			
			// Clamp between 0.1 and 0.8
			return Math.max(0.1, Math.min(0.8, opacity));
		};

		// Animation function
		const animate = () => {
			const trackWidth = getTrackWidth();
			
			// Move position to the left
			position -= speed;

			// Reset position when first track is completely scrolled off screen
			if (position <= -trackWidth) {
				position = position + trackWidth;
			}

			// Apply transform to both tracks
			track.style.transform = `translateX(${position}px)`;
			clone.style.transform = `translateX(${position + trackWidth}px)`;

			// Update opacity for all images based on viewport position
			const allImages = [
				...track.querySelectorAll('.homepage-hero__image'),
				...clone.querySelectorAll('.homepage-hero__image')
			];
			
			allImages.forEach((img) => {
				const opacity = calculateOpacity(img);
				img.style.opacity = opacity;
			});

			// Continue animation
			animationId = requestAnimationFrame(animate);
		};

		// Start animation
		animate();
		action.log('info', 'Homepage carousel initialized and animating');

		// Optional: Pause on hover for better UX
		// element.addEventListener('mouseenter', () => {
		// 	if (animationId) {
		// 		cancelAnimationFrame(animationId);
		// 		animationId = null;
		// 		action.log('info', 'Carousel paused on hover');
		// 	}
		// });

		// element.addEventListener('mouseleave', () => {
		// 	if (!animationId) {
		// 		animate();
		// 		action.log('info', 'Carousel resumed');
		// 	}
		// });

		// Handle window resize
		let resizeTimer;
		const handleResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				// Reset position on resize
				position = 0;
				track.style.transform = 'translateX(0)';
				clone.style.transform = `translateX(${getTrackWidth()}px)`;
				action.log('info', 'Carousel reset on window resize');
			}, 250);
		};
		
		window.addEventListener('resize', handleResize);

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
			window.removeEventListener('resize', handleResize);
			action.log('info', 'Homepage carousel cleaned up');
		});
	}

	// Register the action with Block Actions
	window.BlockActions.registerAction(
		'homepage-carousel',           // Action ID (must match filename)
		'Homepage Carousel',           // Label shown in block editor
		init                          // Initialization function
	);
})();

