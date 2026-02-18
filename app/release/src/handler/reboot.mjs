import axios from 'axios';
import { Agent } from 'https';
import config from '../config.mjs';

const axiosConfig = {
    headers: {
        'Authorization': config.proxmox.token
    },
    httpsAgent: new Agent({ rejectUnauthorized: false })
}

export default async function reboot(request, h) {
    const vmName = request.params.vm;
    try {
        // list VMs and search by name
        const nodesResponse = await axios.get(config.proxmox.baseUrl, axiosConfig);
        let nodeName, vmId;
        for (const node of nodesResponse.data.data) {
            const qemuResponse = await axios.get(`${config.proxmox.baseUrl}/${node.node}/qemu`, axiosConfig);
            const vm = qemuResponse.data.data.find(vm => vm.name === vmName);
            if (vm) {
                nodeName = node.node;
                vmId = vm.vmid;
                break;
            }
        }

        if (!nodeName || !vmId) {
            return h.response({ message: `VM ${vmName} not found` }).code(404);
        }

        const startTime = Date.now();
        const result = [];
        const log = string => {
            console.log(new Date(), '... ' + string);
            result.push(string);
        }
        rebootVm({ nodeName, vmId, vmName, log, startTime }).catch(error => {
            console.error(new Date(), `Error during reboot of VM ${vmName}:`, error);
        });
        return h.response({ message: `VM ${vmName} restart initiated` }).code(200);
    } catch (error) {
        console.error(new Date(), `Error restarting VM ${vmName}:`, error);
        return h.response({ message: `Failed to restart VM ${vmName}: ${error.message}` }).code(500);
    }
}

async function rebootVm({ nodeName, vmId, vmName, log, startTime }) {
    await new Promise(res => setTimeout(res, 5000)); // wait for 5 seconds before starting the restart process to allow the response to be sent

    log(`Sending shutdown command to VM ${vmName} (Node: ${nodeName}, VM ID: ${vmId})`);
    await axios.post(
        `${config.proxmox.baseUrl}/${nodeName}/qemu/${vmId}/status/shutdown`, null, axiosConfig);
    let status;
    for (let i = 0; i < 60; i++) { // check the status every 5 seconds for up to 5 minutes
        await new Promise(res => setTimeout(res, 5000)); // wait for 5 seconds before checking status again
        log(`Checking status of VM ${vmName}...`);
        const response = await axios.get(`${config.proxmox.baseUrl}/${nodeName}/qemu/${vmId}/status/current`, axiosConfig);
        status = response.data.data.status;
        log(`VM ${vmName} status: ${status}`);
        if (status === 'stopped') break;
    }

    // start the VM again
    log(`VM ${vmName} is stopped. Sending start command...`);
    await axios.post(`${config.proxmox.baseUrl}/${nodeName}/qemu/${vmId}/status/start`, null, axiosConfig);
    log(`Start command sent to VM ${vmName}. Restart process completed in ${(Date.now() - startTime) / 1000} seconds.`);
}