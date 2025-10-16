/**
 * Add to Cart Action
 * This action changes the button text to "Added to cart" when clicked.
 * @param {HTMLElement} element - The button element.
 */

import { BaseAction } from './base-action';

export const actionName = 'add-to-cart';

export default function init(element) {
	const action = new BaseAction(element);

	const store = window.wpVip.interactivity.store;
	const { state, actions } = store('vip-commerce-cart');

	action.target.addEventListener('click', async (e) => {
		e.preventDefault();
		action.setTextContent('Added to cart');
		action.log('info', 'Item added to cart');

		if (!action.canExecute()) return;

		const { addPendingItem, resolveCart } = actions;
		addPendingItem();

		action.setTextContent('Added to cart');
		action.logInfo('Item added to cart');

		await action.setInitialCookieForBuyer();
		await action.addItemToCart();

		const cart = await action.getCartItems();

		if (cart) {
			console.log('Cart items retrieved:', cart);
			resolveCart(cart);
		} else {
			console.error('No cart items retrieved');
		}

		// Reset after delay
		setTimeout(() => action.reset(), 2000);
	});
}
