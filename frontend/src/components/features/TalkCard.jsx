import Card from "../ui/Card";

export default function TalkCard({ talk }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{talk.title}</h2>
      <p className="text-gray-600">{talk.speaker}</p>
      <p className="text-sm text-gray-500">
        {talk.start_time} - {talk.end_time}
      </p>
    </Card>
  );
}
