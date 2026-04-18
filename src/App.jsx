import TimelanePro from './components/TimelanePro.jsx';

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TimelanePro dark={false} granularity="month" />
    </div>
  );
}
