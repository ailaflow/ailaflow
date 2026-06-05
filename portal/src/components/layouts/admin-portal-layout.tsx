import { PortalLayout } from './portal-layout';
import { AdminContext } from './admin-context';
import { Chat } from '../chat/chat';
import { ToolCall, ToolDescriptor } from '@aila/model';

export interface AdminPortalLayoutProps {
  children: React.ReactNode;
  disableScroll?: true;
}

const frontendToolDescriptors: ToolDescriptor[] = [
  {
    type: 'function',
    function: {
      name: 'alertMessage',
      description: 'Alert a message',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to alert'
          }
        },
        required: ['message']
      }
    }
  }
];

function fastHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16);
}

const hash = fastHash(JSON.stringify(frontendToolDescriptors));

export function AdminPortalLayout(props: AdminPortalLayoutProps) {
  const sectionClassName = `min-h-0 bg-white${props.disableScroll ? '' : ' overflow-y-auto'}`;

  async function onToolCalled(call: ToolCall) {
    const message = JSON.parse(call.function.arguments).message;
    alert('Hello from admin portal! Message: ' + message);
    return 'Message has been alerted';
  }

  return (
    <PortalLayout>
      <AdminContext>
        <div className="flex h-full min-h-0 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,7fr)_minmax(0,3fr)] md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:grid-rows-1">
            <section className={sectionClassName}>{props.children}</section>

            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white md:border-l md:border-t-0">
              <Chat
                request={{
                  admin: {
                    frontendToolDescriptors,
                    hash
                  }
                }}
                onToolCalled={onToolCalled}
              />
            </aside>
          </div>
        </div>
      </AdminContext>
    </PortalLayout>
  );
}
