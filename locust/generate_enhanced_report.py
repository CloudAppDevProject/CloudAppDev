#!/usr/bin/env python3
"""
Enhanced HTML Report Generator for Locust Load Tests
Generates beautiful, interactive reports with charts and detailed metrics
"""

import sys
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

def load_csv_data(csv_prefix):
    """Load Locust CSV data files"""
    try:
        stats_df = pd.read_csv(f"{csv_prefix}_stats.csv")
        history_df = pd.read_csv(f"{csv_prefix}_stats_history.csv")
        failures_df = pd.read_csv(f"{csv_prefix}_failures.csv") if Path(f"{csv_prefix}_failures.csv").exists() else None
        exceptions_df = pd.read_csv(f"{csv_prefix}_exceptions.csv") if Path(f"{csv_prefix}_exceptions.csv").exists() else None
        
        return stats_df, history_df, failures_df, exceptions_df
    except Exception as e:
        print(f"Error loading CSV files: {e}")
        return None, None, None, None

def create_response_time_chart(history_df):
    """Create interactive response time over time chart"""
    fig = go.Figure()
    
    # Add traces for different percentiles
    fig.add_trace(go.Scatter(
        x=history_df['Timestamp'],
        y=history_df['95%'],
        name='95th Percentile',
        line=dict(color='red', width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=history_df['Timestamp'],
        y=history_df['75%'],
        name='75th Percentile',
        line=dict(color='orange', width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=history_df['Timestamp'],
        y=history_df['50%'],
        name='Median (50th)',
        line=dict(color='green', width=2)
    ))
    
    fig.update_layout(
        title='Response Time Distribution Over Time',
        xaxis_title='Time (seconds)',
        yaxis_title='Response Time (ms)',
        hovermode='x unified',
        template='plotly_white',
        height=400
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_throughput_chart(history_df):
    """Create requests per second chart"""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=history_df['Timestamp'],
        y=history_df['Requests/s'],
        name='Requests/s',
        fill='tozeroy',
        line=dict(color='#3498db', width=2)
    ))
    
    fig.update_layout(
        title='Throughput Over Time',
        xaxis_title='Time (seconds)',
        yaxis_title='Requests per Second',
        hovermode='x unified',
        template='plotly_white',
        height=400
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_user_count_chart(history_df):
    """Create user count over time chart"""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=history_df['Timestamp'],
        y=history_df['User Count'],
        name='Active Users',
        fill='tozeroy',
        line=dict(color='#2ecc71', width=2)
    ))
    
    fig.update_layout(
        title='Active Users Over Time',
        xaxis_title='Time (seconds)',
        yaxis_title='Number of Users',
        hovermode='x unified',
        template='plotly_white',
        height=400
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_endpoint_performance_chart(stats_df):
    """Create bar chart comparing endpoint performance"""
    # Use all rows
    endpoint_stats = stats_df.copy()
    endpoint_stats = endpoint_stats.sort_values('Average Response Time', ascending=False).head(15)
    
    fig = go.Figure(data=[
        go.Bar(
            x=endpoint_stats['Name'],
            y=endpoint_stats['Average Response Time'],
            marker_color='#e74c3c',
            text=endpoint_stats['Average Response Time'].round(2),
            textposition='auto',
        )
    ])
    
    fig.update_layout(
        title='Slowest Endpoints (Top 15)',
        xaxis_title='Endpoint',
        yaxis_title='Average Response Time (ms)',
        xaxis_tickangle=-45,
        template='plotly_white',
        height=500
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_request_distribution_chart(stats_df):
    """Create pie chart of request distribution"""
    endpoint_stats = stats_df.copy()
    
    fig = go.Figure(data=[go.Pie(
        labels=endpoint_stats['Name'],
        values=endpoint_stats['Request Count'],
        hole=.3,
    )])
    
    fig.update_layout(
        title='Request Distribution by Endpoint',
        template='plotly_white',
        height=500
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def create_failure_rate_chart(stats_df):
    """Create failure rate comparison chart"""
    endpoint_stats = stats_df.copy()
    endpoint_stats['Failure Rate'] = (endpoint_stats['Failure Count'] / endpoint_stats['Request Count'] * 100).fillna(0)
    endpoint_stats = endpoint_stats[endpoint_stats['Failure Rate'] > 0].sort_values('Failure Rate', ascending=False)
    
    if len(endpoint_stats) == 0:
        return "<p class='text-success'>✅ No failures detected!</p>"
    
    fig = go.Figure(data=[
        go.Bar(
            x=endpoint_stats['Name'],
            y=endpoint_stats['Failure Rate'],
            marker_color='#e74c3c',
            text=endpoint_stats['Failure Rate'].round(2),
            textposition='auto',
        )
    ])
    
    fig.update_layout(
        title='Failure Rate by Endpoint (%)',
        xaxis_title='Endpoint',
        yaxis_title='Failure Rate (%)',
        xaxis_tickangle=-45,
        template='plotly_white',
        height=400
    )
    
    return fig.to_html(full_html=False, include_plotlyjs='cdn')

def calculate_performance_score(stats_df, history_df):
    """Calculate overall performance score"""
    # Calculate aggregated metrics
    total_requests = stats_df['Request Count'].sum()
    total_failures = stats_df['Failure Count'].sum()
    
    # Metrics
    avg_response_time = stats_df['Average Response Time'].mean()
    failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0
    p95_response_time = stats_df['95%'].mean()
    
    # Scoring (100 point scale)
    response_time_score = max(0, 100 - (avg_response_time / 10))  # Penalty for slow responses
    failure_score = max(0, 100 - (failure_rate * 10))  # Penalty for failures
    p95_score = max(0, 100 - (p95_response_time / 20))  # Penalty for high p95
    
    overall_score = (response_time_score * 0.4 + failure_score * 0.4 + p95_score * 0.2)
    
    return {
        'overall': round(overall_score, 1),
        'response_time': round(response_time_score, 1),
        'failure': round(failure_score, 1),
        'p95': round(p95_score, 1),
        'grade': get_grade(overall_score)
    }

def get_grade(score):
    """Convert score to letter grade"""
    if score >= 90: return 'A'
    elif score >= 80: return 'B'
    elif score >= 70: return 'C'
    elif score >= 60: return 'D'
    else: return 'F'

def get_grade_color(grade):
    """Get color for grade"""
    colors = {'A': '#2ecc71', 'B': '#3498db', 'C': '#f39c12', 'D': '#e67e22', 'F': '#e74c3c'}
    return colors.get(grade, '#95a5a6')

def generate_html_report(csv_prefix, output_file):
    """Generate enhanced HTML report"""
    stats_df, history_df, failures_df, exceptions_df = load_csv_data(csv_prefix)
    
    if stats_df is None or history_df is None:
        print("Failed to load data files")
        return
    
    # Calculate aggregated metrics from all rows
    aggregated = {
        'Request Count': stats_df['Request Count'].sum(),
        'Failure Count': stats_df['Failure Count'].sum(),
        'Average Response Time': stats_df['Average Response Time'].mean(),
        'Min Response Time': stats_df['Min Response Time'].min(),
        'Max Response Time': stats_df['Max Response Time'].max(),
        'Requests/s': stats_df['Requests/s'].sum(),
        '50%': stats_df['50%'].mean(),
        '75%': stats_df['75%'].mean(),
        '90%': stats_df['90%'].mean(),
        '95%': stats_df['95%'].mean(),
        '99%': stats_df['99%'].mean(),
    }
    
    # Create a Series for easier access
    import pandas as pd
    aggregated = pd.Series(aggregated)
    
    performance_score = calculate_performance_score(stats_df, history_df)
    
    # Generate charts
    response_time_chart = create_response_time_chart(history_df)
    throughput_chart = create_throughput_chart(history_df)
    user_count_chart = create_user_count_chart(history_df)
    endpoint_performance_chart = create_endpoint_performance_chart(stats_df)
    request_distribution_chart = create_request_distribution_chart(stats_df)
    failure_rate_chart = create_failure_rate_chart(stats_df)
    
    # Generate HTML
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-2.26.0.min.js"></script>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; margin-bottom: 2rem; }}
        .metric-card {{ background: white; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .score-circle {{ width: 150px; height: 150px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 3rem; font-weight: bold; color: white; }}
        .chart-container {{ background: white; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .stat-box {{ text-align: center; padding: 1rem; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; color: #667eea; }}
        .stat-label {{ color: #6c757d; font-size: 0.9rem; text-transform: uppercase; }}
        .endpoint-table {{ font-size: 0.9rem; }}
        .badge-custom {{ padding: 0.5rem 1rem; border-radius: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🚀 Load Test Report</h1>
            <p class="mb-0">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
    
    <div class="container">
        <!-- Performance Score -->
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="metric-card text-center">
                    <h3>Overall Performance</h3>
                    <div class="score-circle" style="background-color: {get_grade_color(performance_score['grade'])};">
                        {performance_score['grade']}
                    </div>
                    <h4 class="mt-3">{performance_score['overall']}/100</h4>
                </div>
            </div>
            <div class="col-md-8">
                <div class="metric-card">
                    <h4>Score Breakdown</h4>
                    <div class="row mt-3">
                        <div class="col-4 stat-box">
                            <div class="stat-value">{performance_score['response_time']}</div>
                            <div class="stat-label">Response Time</div>
                        </div>
                        <div class="col-4 stat-box">
                            <div class="stat-value">{performance_score['failure']}</div>
                            <div class="stat-label">Reliability</div>
                        </div>
                        <div class="col-4 stat-box">
                            <div class="stat-value">{performance_score['p95']}</div>
                            <div class="stat-label">P95 Latency</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="metric-card stat-box">
                    <div class="stat-value">{aggregated['Request Count']:,}</div>
                    <div class="stat-label">Total Requests</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card stat-box">
                    <div class="stat-value">{aggregated['Requests/s']:.1f}</div>
                    <div class="stat-label">Requests/sec</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card stat-box">
                    <div class="stat-value">{aggregated['Average Response Time']:.1f}ms</div>
                    <div class="stat-label">Avg Response</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card stat-box">
                    <div class="stat-value">{(aggregated['Failure Count'] / aggregated['Request Count'] * 100):.2f}%</div>
                    <div class="stat-label">Failure Rate</div>
                </div>
            </div>
        </div>
        
        <!-- Response Time Percentiles -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="metric-card">
                    <h4>Response Time Percentiles</h4>
                    <div class="row mt-3">
                        <div class="col stat-box">
                            <div class="stat-value" style="font-size: 1.5rem;">{aggregated['50%']:.0f}ms</div>
                            <div class="stat-label">50th (Median)</div>
                        </div>
                        <div class="col stat-box">
                            <div class="stat-value" style="font-size: 1.5rem;">{aggregated['75%']:.0f}ms</div>
                            <div class="stat-label">75th</div>
                        </div>
                        <div class="col stat-box">
                            <div class="stat-value" style="font-size: 1.5rem;">{aggregated['90%']:.0f}ms</div>
                            <div class="stat-label">90th</div>
                        </div>
                        <div class="col stat-box">
                            <div class="stat-value" style="font-size: 1.5rem;">{aggregated['95%']:.0f}ms</div>
                            <div class="stat-label">95th</div>
                        </div>
                        <div class="col stat-box">
                            <div class="stat-value" style="font-size: 1.5rem;">{aggregated['99%']:.0f}ms</div>
                            <div class="stat-label">99th</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Charts -->
        <div class="row">
            <div class="col-12">
                <div class="chart-container">
                    {response_time_chart}
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    {throughput_chart}
                </div>
            </div>
            <div class="col-md-6">
                <div class="chart-container">
                    {user_count_chart}
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="chart-container">
                    {endpoint_performance_chart}
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    {request_distribution_chart}
                </div>
            </div>
            <div class="col-md-6">
                <div class="chart-container">
                    {failure_rate_chart if isinstance(failure_rate_chart, str) and failure_rate_chart.startswith('<') else f'<div class="text-center p-5"><h5 class="text-success">✅ No failures detected!</h5></div>'}
                </div>
            </div>
        </div>
        
        <!-- Endpoint Details Table -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="metric-card">
                    <h4>Detailed Endpoint Statistics</h4>
                    <div class="table-responsive mt-3">
                        <table class="table table-hover endpoint-table">
                            <thead class="table-light">
                                <tr>
                                    <th>Endpoint</th>
                                    <th class="text-end">Requests</th>
                                    <th class="text-end">Failures</th>
                                    <th class="text-end">Avg (ms)</th>
                                    <th class="text-end">Min (ms)</th>
                                    <th class="text-end">Max (ms)</th>
                                    <th class="text-end">P95 (ms)</th>
                                </tr>
                            </thead>
                            <tbody>
"""
    
    # Add endpoint rows
    endpoint_stats = stats_df.sort_values('Average Response Time', ascending=False)
    for _, row in endpoint_stats.iterrows():
        failure_badge = f"<span class='badge bg-danger'>{int(row['Failure Count'])}</span>" if row['Failure Count'] > 0 else "<span class='badge bg-success'>0</span>"
        html_content += f"""
                                <tr>
                                    <td><strong>{row['Name']}</strong></td>
                                    <td class="text-end">{int(row['Request Count']):,}</td>
                                    <td class="text-end">{failure_badge}</td>
                                    <td class="text-end">{row['Average Response Time']:.2f}</td>
                                    <td class="text-end">{row['Min Response Time']:.2f}</td>
                                    <td class="text-end">{row['Max Response Time']:.2f}</td>
                                    <td class="text-end">{row['95%']:.2f}</td>
                                </tr>
"""
    
    html_content += """
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="text-center py-4 text-muted">
            <p>Report generated with ❤️ by Enhanced Locust Reporter</p>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
"""
    
    # Write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Enhanced report generated: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_enhanced_report.py <csv_prefix>")
        print("Example: python generate_enhanced_report.py locust/reports/periodic_workload_20251101_131918")
        sys.exit(1)
    
    csv_prefix = sys.argv[1]
    output_file = f"{csv_prefix}_enhanced.html"
    
    generate_html_report(csv_prefix, output_file)
