import styles from './Button.module.css';

const Button = ({ children, onClick, type = 'button', className = '', ...props }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`${styles.primary} ${className}`}
            {...props}
        >
            Testing
            {children}
        </button>
    );
}

export default Button;