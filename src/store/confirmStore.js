import { create } from 'zustand';

let resolver = null;

export const useConfirmStore = create((set) => ({
  open: false,
  options: {
    title: 'Confirm',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'primary', // primary | danger | success
  },

  show(options) {
    return new Promise((resolve) => {
      resolver = resolve;
      set({
        open: true,
        options: {
          title: 'Confirm',
          message: '',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'primary',
          ...options,
        },
      });
    });
  },

  resolve(value) {
    set({ open: false });
    if (resolver) {
      resolver(value);
      resolver = null;
    }
  },
}));

/**
 * Professional confirmation dialog (replaces window.confirm).
 * @returns {Promise<boolean>}
 */
export function confirmDialog(options) {
  if (typeof options === 'string') {
    return useConfirmStore.getState().show({ message: options });
  }
  return useConfirmStore.getState().show(options || {});
}
