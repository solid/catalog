// Register <solid-ui-button> from the local SolidOS solid-ui package.
// The package's index.js uses extension-less imports (`from './Button'`) which
// node resolves but the browser does not, so we bypass it and define the tag
// ourselves from the Button class.
import { Button } from '/viewer/vendor/solid-ui/Button.js';

if(!customElements.get('solid-ui-button')){
  customElements.define('solid-ui-button', Button);
}

export { Button };
