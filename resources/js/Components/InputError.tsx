export default function InputError({
    message,
    className = '',
}: {
    message?: string;
    className?: string;
}) {
    return message ? (
        <p className={'text-sm text-destructive ' + className}>{message}</p>
    ) : null;
}