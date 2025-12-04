from flask import Flask, render_template, send_file
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt

app = Flask(__name__)

@app.route('/')
def index():
    # load summary
    df = pd.read_csv('outputs/simulasi_ringkasan.csv')
    years = sorted(df['tahun'].unique())
    jobs = df['jenis_pekerjaan'].unique().tolist()
    # pass to template
    return render_template('index.html', years=years, jobs=jobs)

@app.route('/plot/<job>')
def plot_job(job):
    df = pd.read_csv('outputs/simulasi_ringkasan.csv')
    sub = df[df['jenis_pekerjaan']==job].sort_values('tahun')
    fig, ax = plt.subplots(figsize=(8,4))
    ax.plot(sub['tahun'], sub['median'], label='median')
    ax.fill_between(sub['tahun'], sub['p10'], sub['p90'], alpha=0.3, label='p10-p90')
    ax.set_title(job)
    ax.set_xlabel('Tahun')
    ax.set_ylabel('Jumlah penduduk')
    ax.legend()
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')

if __name__=='__main__':
    app.run(debug=True)
