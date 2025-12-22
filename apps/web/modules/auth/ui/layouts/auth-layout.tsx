export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex min-h-screen min-w-screen  h-full flex-col items-center justify-center">
            {children}
        </div>
    );
};