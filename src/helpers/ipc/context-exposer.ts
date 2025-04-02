import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeAuthContext } from "./auth/auth-context";
import { exposeStoreContext } from "./store/store-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeAuthContext();
  exposeStoreContext();
}
