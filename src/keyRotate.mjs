#! /usr/bin/env node

import axios from 'axios';
import rc from 'rc';

const config = rc('keyRotate', {
    key: '', // Key to rotate
    auth: '', // Authorization token if needed
    servers: '' // Comma-separated list of server URLs
});

console.log(config);

const servers = config.servers?.split(',') || config._;
if (servers.length > 0) {
    await Promise.all(servers.map(async serverUrl => {
        try {
            const url = new URL('/keyRotate/' + config.key, serverUrl).toString();
            const headers = config.auth ? { 'Authorization': config.auth } : {};
            const response = await axios.get(url, { headers, timeout: 300000 });
            console.log(`Key rotated for ${serverUrl}:`, response.data);
        } catch (error) {
            if (error.response) {
                console.error(`Error rotating key for server ${serverUrl}:`, error.response.status, error.response.data);
            } else {
                console.error(`Error rotating key for server ${serverUrl}:`, error.message);
            }
        }
    }));
} else {
    console.error('No server URLs provided.');
    process.exit(1);
}
