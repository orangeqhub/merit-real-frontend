import walletLogo from '../../assets/icons/wallet-logo.png';

/**
 * Custom Agent Commission Wallet logo.
 * @param {{ size?: number, className?: string, alt?: string }} props
 */
export default function WalletLogo({ size = 20, className = '', alt = 'Wallet' }) {
  return (
    <img
      src={walletLogo}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}
