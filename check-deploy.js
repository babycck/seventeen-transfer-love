fetch('https://api.github.com/repos/babycck/seventeen-transfer-love/actions/runs?per_page=3')
  .then(r => r.json())
  .then(d => {
    if (d.workflow_runs) {
      d.workflow_runs.forEach(function(run) {
        console.log('Commit:', run.head_commit.message);
        console.log('Status:', run.status, 'Conclusion:', run.conclusion);
        console.log('Updated:', run.updated_at);
        console.log('---');
      });
    } else {
      console.log(JSON.stringify(d).slice(0, 200));
    }
  })
  .catch(e => console.log(e.message));
