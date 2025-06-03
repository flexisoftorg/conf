import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { apiServices } from './api-services.js';
import { project } from './config.js';
import { provider } from './provider.js';

const config = new pulumi.Config('slack');
const name = 'flexi-soft';
const slackAgentTag = 'v3.1.0';
const channel = 'C05CQ64DGBE'; // #flexi-soft-notifications

const topic = new gcp.pubsub.Topic(name, {}, { provider });

const serviceAccount = new gcp.serviceaccount.Account(
  name,
  {
    accountId: name,
  },
  { provider },
);

const service = new gcp.cloudrunv2.Service(
  name,
  {
    name: `slack-logger-${name}`,
    location: 'europe-west1',
    description: `Slack logger – ${name}`,
    template: {
      serviceAccount: serviceAccount.email,
      containers: [
        {
          image: `docker.io/bjerkbot/google-cloud-logger-slack:${slackAgentTag}`,
          envs: [
            {
              name: 'SLACK_TOKEN',
              value: config.requireSecret('bot-oauth-token'),
            },
            {
              name: 'DEFAULT_CHANNEL',
              value: channel,
            },
          ],
        },
      ],
    },
  },
  { provider },
);

new gcp.eventarc.Trigger(
  name,
  {
    location: 'europe-west1',
    transport: {
      pubsub: {
        topic: topic.name,
      },
    },
    matchingCriterias: [
      {
        attribute: 'type',
        value: 'google.cloud.pubsub.topic.v1.messagePublished',
      },
    ],
    serviceAccount: serviceAccount.email,
    destination: {
      cloudRunService: {
        service: service.name,
        region: 'europe-west1',
      },
    },
  },
  { provider, dependsOn: apiServices },
);

new gcp.projects.IAMMember(
  name,
  {
    project: project,
    role: 'roles/eventarc.eventReceiver',
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  },
  { provider },
);

new gcp.cloudrunv2.ServiceIamMember(
  name,
  {
    name: service.name,
    location: 'europe-west1',
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  },
  { provider },
);

const logSink = new gcp.logging.ProjectSink(
  name,
  {
    name,
    filter:
      'operation.producer="github.com/bjerkio/google-cloud-logger-slack@v1"',
    destination: pulumi.interpolate`pubsub.googleapis.com/${topic.id}`,
  },
  { protect: true, provider },
);

new gcp.pubsub.TopicIAMMember(
  name,
  {
    topic: topic.name,
    role: 'roles/pubsub.publisher',
    member: logSink.writerIdentity,
  },
  { protect: true, provider },
);
