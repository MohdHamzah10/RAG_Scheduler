export default function Card({ children }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition border">
      {children}
    </div>
  );
}
