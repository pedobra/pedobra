import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionInfo {
    isTrial: boolean;
    daysRemaining: number;
    isExpired: boolean;
    planId: string;
    organizationName: string;
    organizationId: string;
}

export const useSubscription = () => {
    const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSub = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch profile with organization details
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*, organizations(*)')
                    .eq('id', user.id)
                    .single();
                
                if (error) throw error;

                if (profile?.organizations) {
                    const org = profile.organizations;
                    const end = new Date(org.trial_end);
                    const now = new Date();
                    const diffTime = end.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    setSubInfo({
                        isTrial: org.plan_id === 'trial',
                        daysRemaining: Math.max(0, diffDays),
                        isExpired: diffTime < 0 && org.subscription_status !== 'active',
                        planId: org.plan_id,
                        organizationName: org.name,
                        organizationId: org.id
                    });
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        checkSub();
    }, []);

    return { ...subInfo, loading };
};
