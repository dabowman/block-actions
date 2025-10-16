import { BaseAction } from './base-action';

export const actionName = 'main-nav';

export default function init(element) {
    const action = new BaseAction(element);

    // Ensure initialization happens after DOM is ready
    function initialize() {
        const elements = findElements();
        if (!elements) return;

        setupNavigation(elements);
        setupImageSwap(elements);
    }

    function findElements() {
        // Find the main nav within the header
        const mainNav = element.querySelector('.main-nav');
        if (!mainNav) {
            action.log('error', 'Navigation not found');
            return null;
        }

        // Find sub-nav containers that are siblings of the header
        const subNavContainers = document.querySelectorAll('.sub-nav-container');

        if (!subNavContainers.length) {
            action.log('error', 'No sub-nav containers found');
            return null;
        }

        // Get all nav items that have submenus within the main nav
        const navItemsWithSubMenus = mainNav.querySelectorAll('.has-sub-menu');

        if (!navItemsWithSubMenus.length) {
            action.log('error', 'No submenu triggers found');
            return null;
        }

        return { mainNav, subNavContainers, navItemsWithSubMenus };
    }

    function setupNavigation({ mainNav, subNavContainers, navItemsWithSubMenus }) {
        function hideAllSubNavs() {
            subNavContainers.forEach(container => {
                container.classList.remove('is-active');
            });
            navItemsWithSubMenus.forEach(item => {
                item.classList.remove('is-active');
            });
            mainNav.classList.remove('has-active-submenu');
        }

        function showSubNav(item, index) {
            hideAllSubNavs();

            if (subNavContainers[index]) {
                subNavContainers[index].classList.add('is-active');
                item.classList.add('is-active');

                const itemRect = item.getBoundingClientRect();
                const navRect = mainNav.getBoundingClientRect();
                const centerPosition = (itemRect.left + itemRect.width / 2) - navRect.left - 10;

                mainNav.style.setProperty('--caret-position', `${centerPosition}px`);
                mainNav.classList.add('has-active-submenu');
            }
        }

        // Initialize submenu triggers
        navItemsWithSubMenus.forEach((item, index) => {
            item.addEventListener('mouseenter', () => showSubNav(item, index));
        });

        // Handle mouse leave on header
        element.addEventListener('mouseleave', hideAllSubNavs);
    }

    function setupImageSwap({ subNavContainers }) {
        subNavContainers.forEach(container => {
            const menuGroups = container.querySelectorAll('.wp-block-group');
            const image = container.querySelector('.sub-nav-image img');

            if (image) {
                const originalSrc = image.src;

                menuGroups.forEach(group => {
                    const menuItems = group.querySelectorAll('[data-custom]');

                    menuItems.forEach(item => {
                        item.addEventListener('mouseenter', () => {
                            const imageUrl = item.dataset.custom;
                            if (imageUrl) {
                                image.src = imageUrl;
                            }
                        });

                        item.addEventListener('mouseleave', (e) => {
                            const nextMenuItem = e.relatedTarget?.closest('[data-custom]');
                            if (nextMenuItem) {
                                const nextImageUrl = nextMenuItem.dataset.custom;
                                if (nextImageUrl) {
                                    image.src = nextImageUrl;
                                }
                            } else {
                                image.src = originalSrc;
                            }
                        });
                    });
                });
            }
        });
    }

    // Handle initialization timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}
