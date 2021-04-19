const core = require('@actions/core');
const axios = require('axios');


(async function main() {
    const implementState = core.getInput('implement-state') || "-1"
    let env = {}

    try {
        env = JSON.parse(core.getInput('context-env'));
    } catch (e) {
        core.error('Error parsing environment context: ' + e);
    }

    let issueName = env.ISSUE_NAME;

    core.debug('Searching for change associated with issue ' + issueName);

    let issueSplit = issueName.split(',');

    let orchestrationTask = issueSplit[0].trim().split(':')[1].split('#')

    let issuePipelineName = orchestrationTask[0];
    let issueStageName = orchestrationTask[1];
    let issueBuildNumber = issueSplit[2].trim().split(':')[1]

    changeInfoEndpoint = `https://${env.DEVOPS_INTEGRATION_USER_NAME}:${env.DEVOPS_INTEGRATION_USER_PASS}@${env.INSTANCE_NAME}.service-now.com/api/sn_devops/devops/orchestration/changeInfo?toolId=${env.TOOL_ID}&pipelineName=${issuePipelineName}&stageName=${issueStageName}&buildNumber=${issueBuildNumber}`

    core.debug('changeInfoEndpoint: ' + changeInfoEndpoint);

    let response = {};

    try {
        response = await axios.get(changeInfoEndpoint)
    } catch (e) {
        if (!e.response) {
            core.setFailed('Did not get response when requesting change information:' + e);
            return;
        }

        if (e.response.status != 404 || !e.response.data || !e.response.data.result) {
            core.setFailed('Unexpected response from ServiceNow ' + e.response.status);
            return;
        }

        let result = e.response.data.result;

        core.setOutput('changeFound', result.changeFound);
        core.setOutput('errorMessage', result.errorMessage);
        return;
    }

    let changeInfo = {};

    try {
        changeInfo = response.data.result
    } catch (e) {
        core.setFailed('Unable to read response from ServiceNow: ' + e);
    }

    let changeFound;
    let changeNumber;
    let changeState;

    try {
        changeFound = changeInfo.changeFound;
        changeNumber = changeInfo.number;
        changeState = changeInfo.state; 
    } catch (e) {
        core.setFailed('Unable to read change info from response ' + e);
    }

    if (changeFound && !changeNumber) {
        core.warning('Change found, but no change number returned');
        core.setOutput('changeFound', false);
        return;
    }

    if (changeState !== implementState) {
        core.warning('Change is not in an implement state')
        core.setOutput('changeFound', false);
        return;
    }

    core.setOutput('changeFound', changeFound)
    core.setOutput('changeNumber', changeNumber);

})();