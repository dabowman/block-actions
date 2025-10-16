/**
 * Add to Cart Action
 * This action changes the button text to "Added to cart" when clicked.
 * @param {HTMLElement} element - The button element.
 */

export const actionName = 'add-to-cart-awesome';

export default function init(element) {
    const target = element.querySelector('a') || element;
    const originalText = target.textContent;

    target.addEventListener('click', (e) => {
        e.preventDefault();
        target.textContent = 'Added to cart, awesome!';

        // Optional: Reset the text after 2 seconds
        setTimeout(() => {
            target.textContent = originalText;
        }, 2000);
    });
}
