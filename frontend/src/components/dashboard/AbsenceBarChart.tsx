// /frontend/src/components/dashboard/AbsenceBarChart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from "@/components/ui/Card";

interface AbsenceBarChartProps {
  data: any; // The raw scraped_data json
}

export default function AbsenceBarChart({ data }: AbsenceBarChartProps) {
  const processData = () => {
    if (!data?.absences?.absences) {
      return [];
    }
    
    const courseCounts = data.absences.absences.reduce((acc: any, absence: any) => {
      const courseName = absence.course || 'Unknown Course';
      acc[courseName] = (acc[courseName] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(courseCounts).map(courseName => ({
      name: courseName.substring(0, 10) + (courseName.length > 10 ? '...' : ''), // Truncate long names
      absences: courseCounts[courseName],
    }));
  };

  const chartData = processData();

  if (chartData.length === 0) {
    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="font-heading text-sm text-text-secondary mb-2">{`// ABSENCE FREQUENCY LOG`}</h3>
            <div className="flex-grow flex items-center justify-center">
                <p className="text-text-secondary font-mono">No absence data available.</p>
            </div>
        </Card>
    );
  }

  return (
    <Card className="p-4">
        <h3 className="font-heading text-sm text-text-secondary mb-2">{`// ABSENCE FREQUENCY LOG`}</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="rgba(74, 74, 77, 0.5)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#8F93A2" tick={{ fontFamily: "'Fira Code', monospace", fontSize: 12 }} />
                    <YAxis stroke="#8F93A2" allowDecimals={false} tick={{ fontFamily: "'Fira Code', monospace", fontSize: 12 }} />
                    <Tooltip
                        cursor={{ fill: 'rgba(137, 221, 255, 0.1)' }}
                        contentStyle={{
                            background: "rgba(37, 37, 40, 0.9)",
                            border: "1px solid #8F93A2",
                            color: "#C3E88D",
                            fontFamily: "'Fira Code', monospace"
                        }}
                    />
                    <Bar dataKey="absences" fill="rgba(137, 221, 255, 0.6)" stroke="#89DDFF" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
}