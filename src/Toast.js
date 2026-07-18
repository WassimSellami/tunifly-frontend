const Toast = ({ toast }) => {
    if (!toast) return null;

    return <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>{toast.message}</div>;
};

export default Toast;
