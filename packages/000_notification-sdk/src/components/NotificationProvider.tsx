export function NotificationProvider() {
  const providerStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 999999,
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
    backgroundColor: "red",
  };

  return <div style={providerStyle}>yoyo</div>;
}
